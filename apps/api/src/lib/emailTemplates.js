// invitation email template
const inviteTemplate = ({ inviterName, workspaceName, loginUrl }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #6366f1;">You've been invited! 🎉</h2>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on Team Hub.</p>
    <a 
      href="${loginUrl}" 
      style="
        background: #6366f1; 
        color: white; 
        padding: 12px 24px; 
        border-radius: 6px; 
        text-decoration: none;
        display: inline-block;
        margin-top: 16px;
      "
    >
      Accept Invitation
    </a>
    <p style="color: #888; margin-top: 24px; font-size: 12px;">
      If you didn't expect this invitation, you can ignore this email.
    </p>
  </div>
`

// @mention email template
const mentionTemplate = ({ mentionerName, workspaceName, commentContent, appUrl }) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #6366f1;">You were mentioned 💬</h2>
    <p><strong>${mentionerName}</strong> mentioned you in <strong>${workspaceName}</strong>:</p>
    <div style="
      background: #f3f4f6; 
      border-left: 4px solid #6366f1; 
      padding: 12px 16px; 
      border-radius: 4px;
      margin: 16px 0;
    ">
      <p style="margin: 0;">${commentContent}</p>
    </div>
    <a 
      href="${appUrl}" 
      style="
        background: #6366f1; 
        color: white; 
        padding: 12px 24px; 
        border-radius: 6px; 
        text-decoration: none;
        display: inline-block;
      "
    >
      View Comment
    </a>
  </div>
`

module.exports = { inviteTemplate, mentionTemplate }