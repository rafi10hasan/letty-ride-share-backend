const contactEmailTemplate = (description: string) => `
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #4f46e5;
          color: #ffffff;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
        }
        .content {
          padding: 30px;
          color: #333333;
        }
        .content h2 {
          font-size: 20px;
          margin-bottom: 15px;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          color: #555555;
          margin-bottom: 25px;
        }
        .footer {
          padding: 20px;
          text-align: center;
          font-size: 13px;
          color: #999999;
          background-color: #f9f9f9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Contact Message</h1>
        </div>
        <div class="content">
          <h2>Message Details:</h2>
          <p>${description}</p>
        </div>
        <div class="footer">
          This message was sent from cookconnkt website contact form.
        </div>
      </div>
    </body>
  </html>
`;

export default contactEmailTemplate;
