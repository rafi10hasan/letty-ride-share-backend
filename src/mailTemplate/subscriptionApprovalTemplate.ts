const subscriptionApprovalEmailTemplate = (
  userName: string,
  planName: string | null,
  status: string 
) => {
  
  const isApproved = status.toLowerCase() === 'approved';
  
  const statusMessage = isApproved 
    ? `You now have full access to the <strong>${planName}</strong> plan. Enjoy your premium features!`
    : `Unfortunately, your request for the ${planName} plan could not be processed at this time.`;

  return `
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
          background-color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background-color: rgb(120, 54, 243);
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
          border-left: 4px solid ${isApproved ? '#4CAF50' : 'rgb(231, 64, 128)'};
          padding: 20px;
          font-size: 16px;
          line-height: 1.5;
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
          <h1>Subscription Update</h1>
        </div>
        <div class="content">
          <div class="message-box">
            Hello <strong>${userName}</strong>,<br><br>
            The administrator has <strong>${status.toLowerCase()}</strong> your subscription request.<br><br>
            ${statusMessage}
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.
        </div>
      </div>
    </body>
  </html>
`;
};

export default subscriptionApprovalEmailTemplate;