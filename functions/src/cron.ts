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
            if (!examDate) {
                if (!monthlyExpirationsByPartner[partnerId]['N/A']) {
                    monthlyExpirationsByPartner[partnerId]['N/A'] = 0;
                }
                monthlyExpirationsByPartner[partnerId]['N/A']++;
                return;
            }

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

        // Find the closest expiration date among the devices triggering the notification
        let closestDateStr = "";
        let earliestDateVal = Number.MAX_SAFE_INTEGER;
        for (const device of userDevicesToNotify) {
            let examDate = device.kovetkezoIdoszakosVizsgalat || device.kov_vizsg || "";
            if (examDate) {
                const parts = examDate.replace(/\./g, '-').split('-');
                if (parts.length === 3) {
                    const dVal = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])).getTime();
                    if (dVal < earliestDateVal) {
                        earliestDateVal = dVal;
                        closestDateStr = examDate.replace(/-/g, '.');
                    }
                }
            }
        }
        if (!closestDateStr) closestDateStr = "N/A (meghatározatlan)";

        let emailHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.5;">
            <p>Tisztelt Üzemeltető!</p>
            <p>Ez egy az ETAR rendszer által generált automatikus tájékoztató üzenet.</p>
            <p>Értesítjük, hogy a rendszerünkben az Önök vállalata alatt nyilvántartott eszközök következő vizsgálati időpontjai alapján az alábbi kötelezettségek válnak esedékessé. Az üzembiztonság és a szabálykövető működés érdekében kérjük, szíveskedjenek intézkedni az alábbiak szerint:</p>
            <p>A biztonságos munkavégzés érdekében kérjük, gondoskodjon:</p>
            <ul style="list-style-type: none; padding-left: 0; margin-bottom: 15px;">
                <li style="margin-bottom: 8px;"><strong>a)</strong> az érintett eszközök mihamarabbi időszakos vizsgálatának elvégzéséről és dokumentálásáról;</li>
                <li><strong>b)</strong> vagy amennyiben a kifutó vizsgálati határidővel rendelkező eszközök már nincsenek használatban (nem fellelhetőek, használatból kivonták vagy selejtezték őket), a rendszer naprakészségének biztosítása érdekében kérjük, állítsa azokat inaktív státuszba, majd végezze el a selejtezési folyamatot az ETAR felületén.</li>
            </ul>
            <p>A konkrét teendők pontosításához, kérjük, tekintse meg az ETAR rendszer „Eszközlista” és „Statisztika” oldalait, ahol közvetlenül kezdeményezheti a vizsgálati időpontok egyeztetését is.</p>
            <h3 style="margin-bottom: 10px; margin-top: 25px; font-size: 16px; color: #333; font-weight: 600;">A következő időszakban esedékes vizsgálatok összefoglalója:</h3>`;

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

        const sortedMonths = Object.keys(userMonthlyExpirations).sort((a,b) => {
            if (a === 'N/A') return 1;
            if (b === 'N/A') return -1;
            return a.localeCompare(b);
        });

        if (sortedMonths.length > 0) {
            const monthNames = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
            
            let tableRowsHtml = sortedMonths.map(month => {
                let monthLabel = month;
                if (month === 'N/A') {
                    monthLabel = 'N/A (meghatározatlan)';
                } else {
                    const [year, m] = month.split('-');
                    if (year && m) {
                        const monthIndex = parseInt(m, 10) - 1;
                         if (monthIndex >= 0 && monthIndex < 12) {
                             monthLabel = `${year}. ${monthNames[monthIndex]}`;
                         }
                    }
                }
                return `<tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">${monthLabel}</td>
                    <td style="text-align: right; font-weight: bold; padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${userMonthlyExpirations[month]} db</td>
                </tr>`;
            }).join('');

            emailHtml += `
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.5rem; margin-bottom: 25px;">
                <table style="width: 100%; max-width: 600px; border-collapse: collapse; text-align: left;">
                    <thead style="background-color: #f3f4f6; color: #4b5563; text-transform: uppercase;">
                        <tr>
                            <th style="padding: 10px; font-weight: bold;">Esedékesség hónapja</th>
                            <th style="padding: 10px; font-weight: bold; text-align: right;">Eszközök darabszáma</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>`;
        }
        
        emailHtml += `
            <p style="margin-bottom: 20px;"><strong>Legközelebbi esedékesség dátuma: ${closestDateStr}</strong></p>
            <p>Kérjük, a folyamatos és biztonságos munkamenet érdekében a szükséges egyeztetéseket mielőbb tegye meg a rendszeren keresztül.</p>
            <p style="margin-top: 30px;">Üdvözlettel:<br>
            H-ITB Kft.<br>
            ETAR team</p>
        </div>`;

        if (hasDevices) {
            const emailsRaw = user.automaticMonitoringEmails;
            const emailsString = Array.isArray(emailsRaw) ? emailsRaw.join(",") : emailsRaw;
            try {
                await mailTransporter.sendMail({
                    from: `"ETAR Rendszer" <${process.env.GMAIL_EMAIL}>`,
                    to: emailsString,
                    subject: "Értesítés esedékes eszközvizsgálatokról – ETAR rendszer automatikus üzenete",
                    html: emailHtml
                });
                console.log(`Sent summary to ${emailsString}`);
            } catch (err) {
                console.error(`Error sending summary to ${emailsString}:`, err);
            }
        }
    }
});
