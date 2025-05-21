import { Browser, Page } from "playwright";
import { getWorkspaceSlug, initBrowser, setupLogger } from "@utils/utils";
import { signInWithGoogleToNotion } from "@utils/auth.utils";
import { User } from "./types/notion.types";
import { notionConfig } from "./config/notion.config";
import fs from "fs";
import path from "path";

const logger = setupLogger('NOTION-AUTOMATION');

async function getWorkSpaceMembers(page: Page): Promise<User[]> {
    try {
        const settingsButton = await page.getByLabel('Sidebar', { exact: true }).getByRole('button', { name: 'Settings', exact: true })
        if (!settingsButton) {
            throw new Error('Settings button not found');
        }
        await settingsButton.click();

        const usersButton = page.getByTestId('settings-tab-members');
        await usersButton.click();

        const memebersButton = await page.getByText('Members', { exact: true })
        await memebersButton.click();

        // Handle open notion in app dialog
        const openInAppDialogClosButton = await page.getByRole('button') && page.getByLabel('Dismiss');
        if (await openInAppDialogClosButton.isVisible({ timeout: 3000 })) {
            await openInAppDialogClosButton.click();
        }

        const tableLocator = page.locator('table');

        const urlPath = page.url();
        const workSpaceName = getWorkspaceSlug(urlPath);
        logger.info('Workspace Name:', workSpaceName);

        await tableLocator.locator('tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });

        const screenshotFileName = `${workSpaceName}-screenshot-${new Date().toISOString().replace(/:/g, '-')}.png`;
        fs.mkdirSync('screenshots/users-screen', { recursive: true })
        const path = `screenshots/users-screen/${screenshotFileName}`
        await page.getByRole('tabpanel').screenshot({
            path: path,
        });
        logger.info('Screenshot taken & saved to:', path);


        const rowLocators = tableLocator.locator('tbody tr');
        const rowCount = await rowLocators.count();

        const users: User[] = []

        for (let i = 0; i < rowCount; i++) {
            let groups: string[] = [];
            const row = rowLocators.nth(i);
            const data = row.locator('td')

            const userCell = data.nth(0);
            await userCell.locator('div[title]').first().waitFor({ state: 'visible' });
            // Extract name (no "@" in title)
            const nameLocator = userCell.locator('div[title]:not([title*="@"])');
            const nameText = await nameLocator.first().getAttribute('title');
            // Extract email (title contains "@")
            const emailLocator = userCell.locator('div[title*="@"]');
            const emailText = await emailLocator.first().getAttribute('title');

            const teamspaceCell = data.nth(1);
            const teamspaceText = await teamspaceCell.locator('span[title]').first().innerText();

            const groupsCell = data.nth(2);
            const groupSpans = groupsCell.locator('span[title]');
            const visibleGroupCount = await groupSpans.count();

            if (visibleGroupCount > 0) {
                for (let j = 0; j < visibleGroupCount; j++) {
                    const title = await groupSpans.nth(j).getAttribute('title');
                    if (title) groups.push(title);
                }
            } else {
                // Only count is shown, so click to view the list of groups
                const triggerButton = groupsCell.locator('div[role="button"]');

                await triggerButton.click();

                const popup = page.locator('[role="menu"]');
                await popup.waitFor({ state: 'visible', timeout: 5000 });

                const menuItems = popup.locator('[role="menuitem"]');

                for (let j = 0; j < await menuItems.count(); j++) {
                    const item = menuItems.nth(j);
                    const itemText = await item.innerText();

                    if (itemText) {
                        const innterText = itemText
                            .replace(/\n+/g, " ")
                            .replace(/\s+/g, " ")
                            .trim()
                            .split(" ");

                        //! THIS WILL SKIP GROUP NAMES WITH 1 CHARACTER
                        const groupName = innterText[0].length > 1 ? innterText[0] : innterText[1];
                        if (groupName) groups.push(groupName);
                    }

                }

                const popupGroups = popup.locator('[title]');
                const popupGroupCount = await popupGroups.count();

                for (let j = 0; j < popupGroupCount; j++) {
                    const title = await popupGroups.nth(j).getAttribute('title');
                    if (title) groups.push(title);
                }

                await page.keyboard.press('Escape');
            }

            const roleCell = data.nth(3);
            const roleText = await roleCell.innerText();
            const roles = roleText.split(',').map(role => role.trim());

            const userData: User = {
                name: nameText || "not found",
                email: emailText || "not found",
                teamSpace: teamspaceText,
                groups: groups,
                roles: roles
            };
            users.push(userData);
        }

        return users;

    } catch (error) {
        console.error('Error navigating to settings page:', error);
        throw new Error(`Failed to navigate to settings page: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function saveUsersData(users: User[], workspaceName: string): Promise<string> {
    try {
        const outputDir = path.join('output', 'workspace-users');
        fs.mkdirSync(outputDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const fileName = `${workspaceName}-user-data-${timestamp}.json`;
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
        return filePath;
    } catch (error) {
        logger.error('Error saving users data:', error);
        throw new Error(`Failed to save users data: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function notionAutomation() {
    let browser: Browser | null = null;

    try {
        const { browser: initiatedBrowser, context, page } = await initBrowser();
        browser = initiatedBrowser;
        logger.info('Browser launched and context created.');

        if (!notionConfig.googleEmail || !notionConfig.googlePassword) {
            throw new Error("Missing googleEmail or googleEmail in .env");
        }

        const signIn = await signInWithGoogleToNotion({
            userName: notionConfig.googleEmail,
            password: notionConfig.googlePassword,
            page,
            context
        });

        if (!signIn) {
            logger.error('Failed to sign in with Google');
            throw new Error("Failed to sign in with Google");
        }

        const usersInWorkspace = await getWorkSpaceMembers(page);
        logger.info('usersInWorkspace', usersInWorkspace);

        const urlPath = page.url();
        const workspaceName = getWorkspaceSlug(urlPath);
        if(!workspaceName) throw new Error('Failed to get workspace name from URL');

        const savedFilePath = await saveUsersData(usersInWorkspace, workspaceName);
        logger.info('Users data saved to:', savedFilePath);

    } catch (error) {
        console.error('An error occurred:', error);
        throw new Error(`Automation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (browser) {
            logger.info('Closing browser...');
            await browser.close();
        }
    }
}

notionAutomation()
    .catch((e) => {
        console.error('error', e);
    });