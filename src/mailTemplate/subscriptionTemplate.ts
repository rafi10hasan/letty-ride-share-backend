const subscriptionRequestEmailTemplate = (
  userName: string,
  userEmail: string,
  planName: string,
  subscriptionMode: string,
  teamName: string
) => `
  <html lang="en">
    <head>
      <style>
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f7f9fc;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 0;
          background-color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background-color: rgb(250, 127, 56);
          padding: 25px;
          color: #ffffff;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 30px;
          color: #333333;
        }
        .message-box {
          background-color: #f0f4f8;
          border-left: 4px solid rgb(109, 65, 211);
          padding: 20px;
          margin-bottom: 25px;
          font-size: 16px;
          line-height: 1.5;
        }
        .details-list {
          width: 100%;
          border-collapse: collapse;
        }
        .details-list td {
          padding: 12px 0;
          border-bottom: 1px solid #eeeeee;
          font-size: 15px;
        }
        .label {
          color: #777777;
          font-weight: bold;
          width: 40%;
        }
        .value {
          color: #333333;
          font-weight: 600;
          text-align: right;
        }
        .footer {
          padding: 20px;
          font-size: 13px;
          color: #999999;
          text-align: center;
          background-color: #fcfcfc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Subscription Request</h1>
        </div>
        <div class="content">
          <div class="message-box">
            Hello Admin, <br>
            <strong>${userName}</strong> has requested a new subscription on <strong>${teamName}</strong>.
          </div>
          
          <table class="details-list">
            <tr>
              <td class="label">User Name</td>
              <td class="value">${userName}</td>
            </tr>
            <tr>
              <td class="label">User Email</td>
              <td class="value">${userEmail}</td>
            </tr>
            <tr>
              <td class="label">Requested Plan</td>
              <td class="value" style="color: rgb(109, 65, 211);">${planName}</td>
            </tr>
            <tr>
              <td class="label">Access Mode</td>
              <td class="value">${subscriptionMode}</td>
            </tr>
          </table>
          
          <p style="margin-top: 25px; font-size: 14px; color: #666;">Please review the request from the admin panel to take further action.</p>
        </div>
      </div>
    </body>
  </html>
`;

export default subscriptionRequestEmailTemplate;