import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

export const scheduledUpcomingExpirationsEmail = onSchedule("every day 02:00", async (event) => {
    // 1. Get current date, +45 days
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 45);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStrDot = `${today.getFullYear()}.${pad(today.getMonth() + 1)}.${pad(today.getDate())}`;
    const maxDateStrDot = `${maxDate.getFullYear()}.${pad(maxDate.getMonth() + 1)}.${pad(maxDate.getDate())}`;

    const todayStrDash = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const maxDateStrDash = `${maxDate.getFullYear()}-${pad(maxDate.getMonth() + 1)}-${pad(maxDate.getDate())}`;

    const db = admin.firestore();
    
    // 2. Query users who have automaticMonitoringEmails set
    const usersSnap = await db.collection("users").get();
    const monitoringUsers = usersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(u => !u.isEjkUser && u.automaticMonitoringEmails && u.automaticMonitoringEmails.length > 0);

    if (monitoringUsers.length === 0) {
        console.log("No users with automatic monitoring enabled. Exiting.");
        return;
    }

    // 3. Collect devices for relevant partners
    const partnerIds = new Set<string>();
    monitoringUsers.forEach(u => {
        if (u.partnerRoles) {
            Object.keys(u.partnerRoles).forEach(pid => partnerIds.add(pid));
        }
    });

    const devicesToNotifyByPartner: Record<string, any[]> = {};
    const monthlyExpirationsByPartner: Record<string, Record<string, number>> = {};

    // Group devices by partner
    for (const partnerId of partnerIds) {
        devicesToNotifyByPartner[partnerId] = [];
        monthlyExpirationsByPartner[partnerId] = {};
        const devicesSnap = await db.collection(`partners/${partnerId}/devices`).get();
        devicesSnap.docs.forEach(deviceDoc => {
            const data = deviceDoc.data();
            const examDate = data.kovetkezoIdoszakosVizsgalat || data.kov_vizsg || "";
            if (!examDate) return;

            const examDateDash = examDate.replace(/\./g, '-');
            if (examDateDash >= todayStrDash) {
                const yearMonth = examDateDash.substring(0, 7); // "YYYY-MM"
                if (!monthlyExpirationsByPartner[partnerId][yearMonth]) {
                    monthlyExpirationsByPartner[partnerId][yearMonth] = 0;
                }
                monthlyExpirationsByPartner[partnerId][yearMonth]++;
            }

            if (examDate === maxDateStrDot || examDate === maxDateStrDash || 
                examDate === todayStrDot || examDate === todayStrDash) {
                devicesToNotifyByPartner[partnerId].push({ id: deviceDoc.id, ...data });
            }
        });
    }

    // 4. Send emails
    for (const user of monitoringUsers) {
        let hasDevices = false;

        // Collect all devices for this user into a single list
        const userDevicesToNotify: any[] = [];
        if (user.partnerRoles) {
            for (const partnerId of Object.keys(user.partnerRoles)) {
                if (devicesToNotifyByPartner[partnerId]) {
                    userDevicesToNotify.push(...devicesToNotifyByPartner[partnerId]);
                }
            }
        }

        if (userDevicesToNotify.length === 0) continue;
        hasDevices = true;

        // Group the user's devices by their expiration date
        const devicesByDate: Record<string, any[]> = {};
        for (const device of userDevicesToNotify) {
            let examDate = device.kovetkezoIdoszakosVizsgalat || device.kov_vizsg || "";
            // Replace dashes with dots for standard Hungarian display
            examDate = examDate.replace(/-/g, '.');
            
            if (!devicesByDate[examDate]) {
                devicesByDate[examDate] = [];
            }
            devicesByDate[examDate].push(device);
        }

        let emailHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
            <p>Tisztelt ${user.displayName || "Felhasználó"}!</p>`;

        for (const date of Object.keys(devicesByDate)) {
            emailHtml += `
            <p><strong>${date}</strong> dátummal esedékes néhány eszközének a vizsgálata.</p>
            <p>Kérjük tekintse meg az eszközlistában és a statisztikák oldalon a konkrét teendőket és egyeztessen mielőbb egy vizsgálati időpontot az ETAR rendszeren keresztül!</p>`;
        }

        // Now add the monthly expirations table
        const userMonthlyExpirations: Record<string, number> = {};
        if (user.partnerRoles) {
            for (const partnerId of Object.keys(user.partnerRoles)) {
                if (monthlyExpirationsByPartner[partnerId]) {
                    for (const [yearMonth, count] of Object.entries(monthlyExpirationsByPartner[partnerId])) {
                        if (!userMonthlyExpirations[yearMonth]) {
                            userMonthlyExpirations[yearMonth] = 0;
                        }
                        userMonthlyExpirations[yearMonth] += count;
                    }
                }
            }
        }

        const sortedMonths = Object.keys(userMonthlyExpirations).sort();
        if (sortedMonths.length > 0) {
            const monthNames = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
            
            let tableRowsHtml = sortedMonths.map(month => {
                const [year, m] = month.split('-');
                const monthName = monthNames[parseInt(m, 10) - 1];
                return `<tr>
                    <td style="padding: 10px; border-bottom: 1px solid #374151; color: #d1d5db;">${year}. ${monthName}</td>
                    <td style="text-align: right; font-weight: bold; padding: 10px; border-bottom: 1px solid #374151; color: #ffffff;">${userMonthlyExpirations[month]} db</td>
                </tr>`;
            }).join('');

            emailHtml += `
            <br><h3 style="margin-bottom: 10px; font-size: 16px; color: #ffffff; font-weight: 600;">Következő vizsgálatok esedékessége</h3>
            <div style="background-color: #111827; border: 1px solid #374151; border-radius: 0.5rem; padding: 0.5rem; margin-bottom: 25px; margin-top: 5px;">
                <table style="width: 100%; max-width: 600px; border-collapse: collapse; text-align: left;">
                    <thead style="background-color: #1f2937; color: #9ca3af; text-transform: uppercase; font-size: 12px;">
                        <tr>
                            <th style="padding: 10px; font-weight: normal;">HÓNAP</th>
                            <th style="padding: 10px; font-weight: normal; text-align: right;">DARABSZÁM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>`;
        }
        
        emailHtml += `
            <p style="margin-top: 30px;">Üdvözlettel:<br>
            <strong>H-ITB Kft. ETAR team</strong></p>
        </div>`;

        if (hasDevices) {
            const emailsRaw = user.automaticMonitoringEmails;
            const emailsString = Array.isArray(emailsRaw) ? emailsRaw.join(",") : emailsRaw;
            try {
                await mailTransporter.sendMail({
                    from: `"ETAR Rendszer" <${process.env.GMAIL_EMAIL}>`,
                    to: emailsString,
                    subject: "Vizsgálati időpont emlékeztető",
                    html: emailHtml
                });
                console.log(`Sent summary to ${emailsString}`);
            } catch (err) {
                console.error(`Error sending summary to ${emailsString}:`, err);
            }
        }
    }
});
