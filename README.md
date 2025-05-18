# Notion Browser Automation

A browser automation to get the list of users and their information from Notion's workspace

1. **Playwright**
2. **Node.js**
3. **TypeScript**

## Automation flow

1. Navigate to Notion's login page
2. Click to Sign in with Google and log in with email address and password from the environment.
   - If 2FA is enabled,
     - If the user needs to press "Yes" on another device, wait for it to be completed.
     - If the 2FA is TOTP, generate OTP using the TOTP from the environment and enter it, and continue. (otpauth)
4. Once the Notion app is loaded, navigate to the Settings page.
5. Click on the Members tab.
6. Take a screenshot of the members window and save to `/screenshots/users-screen/..`
7. View the list of members in the current workspace.
8. Get the user's data.
   - Get name.
   - Get email address.
   - Get the Groups the user is in
     - If the user is in multiple groups, click on the dropdown to view the list of groups and get all the group names
     - If the user is only in 1 group. Get the group name
   - Get the role of the user
9. Create an array of users and log the data.
    ``` ts
    [
      {
        name: 'Jeffin ',
        email: 'jeffin****@gmail.com',
        teamSpace: "Jeffin's Notes HQ",
        groups: [ 'admins', 'moderators' ],
        roles: [ 'Workspace owner' ]
      },
      {
        name: 'Jeffin J',
        email: 'jeffin****@gmail.com',
        teamSpace: "Jeffin's Notes HQ",
        groups: [ 'admins' ],
        roles: [ 'Workspace owner' ]
      }
    ]
    ```

## Project setup

 - **Node version** - v22.13.1
 - **playwright**: 1.52.0

 - Run:
   ```
   npm install
   ```
   
   ```
   npm run start
   ```

 - `.env`
   ```env
   GOOGLE_EMAIL=
   GOOGLE_PASSWORD=
   TOTP_SECRET=
   LOGIN_URL=
   ```  


## What I learned

1. You can set up a Playwright project using `npm init playwright@latest`, which is for automated testing.
   But we don't have to use that project, we can set up a TypeScript project and use Playwright as a library and write scripts for the automation.
2. You can launch the browser in headless mode. 
3. You can get the selector by using `page.pause()`
   Then use "Pick locator" to identify the actual selector for the component and use that in the script to locate an HTML component.
   And browser's devtools to find detailed information.
4. When launching the browser, we need to set `--disable-blink-features=AutomationControlled` to automate the authentication. (Google will consider this an unsafe browser if we don't set this arg.)
5. We can use "context" to listen for popups, which was useful in the Sign In with Google step.
6. At any point, the web app can show a dialog that can disrupt the automation if it is not handled.
   E.g., Open Notion in App dialog
7. If there is a user who's invited to the workspace, but the user hasn't confirmed the invitation yet, the user will be shown in a different format, which should be handled.
    (This depends on the requirement, do we need the invited users in our data)
8. You can take a screenshot of the entire page or just a window/HTML component.

