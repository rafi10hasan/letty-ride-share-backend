const subscriptionUpdateEmailTemplate = (
  fullName: string,
  plan: string,
  billingCycle: string | null,
  expiryDate: Date | null
): string => {
  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const formattedCycle = billingCycle
    ? billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)
    : null;

  const planColor: Record<string, string> = {
    free: '#6B7280',
    basic: '#3B82F6',
    premium: '#F59E0B',
    enterprise: '#8B5CF6',
  };

  const color = planColor[plan.toLowerCase()] ?? '#3B82F6';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Subscription Updated</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:${color};padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Subscription Updated
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
                Your plan has been successfully changed
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;color:#374151;font-size:16px;">
                Hi <strong>${fullName}</strong>,
              </p>
              <p style="margin:0 0 32px;color:#6B7280;font-size:15px;line-height:1.6;">
                Your subscription has been updated by our team. Here are your new plan details:
              </p>

              <!-- Plan Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">

                    <!-- Plan -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Plan</td>
                        <td align="right">
                          <span style="background-color:${color};color:#ffffff;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;">
                            ${plan.charAt(0).toUpperCase() + plan.slice(1)}
                          </span>
                        </td>
                      </tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />

                    <!-- Billing Cycle -->
                    ${formattedCycle ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Billing Cycle</td>
                        <td align="right" style="color:#111827;font-size:15px;font-weight:600;">${formattedCycle}</td>
                      </tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                    ` : ''}

                    <!-- Expiry Date -->
                    ${formattedExpiry ? `
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Expires On</td>
                        <td align="right" style="color:#111827;font-size:15px;font-weight:600;">${formattedExpiry}</td>
                      </tr>
                    </table>
                    ` : ''}

                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#6B7280;font-size:14px;line-height:1.6;">
                If you have any questions about your subscription, please don't hesitate to contact our support team.
              </p>
              <p style="margin:0;color:#6B7280;font-size:14px;">
                Thank you for being with us!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                This is an automated message. Please do not reply to this email.
              </p>
              <p style="margin:8px 0 0;color:#9CA3AF;font-size:12px;">
                © ${new Date().getFullYear()} Ride Share. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export default subscriptionUpdateEmailTemplate;