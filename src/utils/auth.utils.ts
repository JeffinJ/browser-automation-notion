import { BrowserContext, Page } from "playwright";
import { setupLogger } from "./utils";
import { notionConfig } from "../config/notion.config";
import { TOTP } from "otpauth";

const logger = setupLogger('AUTH');

type SignInWithGoogleToNotionParams = {
    userName: string;
    password: string;
    page: Page;
    context: BrowserContext;
};

export async function signInWithGoogleToNotion({
    userName,
    password,
    page,
    context
}: SignInWithGoogleToNotionParams): Promise<boolean> {
    try {
        if (!userName || !password) {
            throw new Error("Missing GOOGLE_EMAIL or GOOGLE_PASSWORD in .env");
        }

        logger.info('Starting Google authentication process...');
        await page.goto(notionConfig.notionLoginUrl, { waitUntil: 'domcontentloaded' });

        const [popup] = await Promise.all([
            context.waitForEvent('page'),
            page.click('text=Continue with Google')
        ]);

        await popup.waitForLoadState('domcontentloaded');

        await popup.waitForSelector('input[type="email"]', { timeout: 10000 });
        await popup.fill('input[type="email"]', userName);
        await popup.click('button:has-text("Next")');

        await popup.waitForSelector('input[type="password"]', { timeout: 10000 });
        await popup.fill('input[type="password"]', password);
        await popup.click('button:has-text("Next")');

        const TWO_FACTOR_SELECTOR = 'input[aria-label="Enter code"]';
        const has2FA = await popup.waitForSelector(TWO_FACTOR_SELECTOR, { timeout: 5000 })
            .then(() => true)
            .catch(() => false);


        if (has2FA) {
            logger.info('2FA verification required');

            if (!notionConfig.totpSecret) {
                throw new Error("TOTP secret is required for 2FA but was not provided");
            }

            const totp = new TOTP({
                issuer: 'google',
                label: notionConfig.googleEmail,
                secret: notionConfig.totpSecret,
            });
            const otpCode = totp.generate();

            const _2FAInputField = await popup.getByRole('textbox', { name: 'Enter code' });
            if (!_2FAInputField) {
                throw new Error("Failed to find the 2FA input field");
            }
            await popup.fill(TWO_FACTOR_SELECTOR, otpCode);
            await popup.click('button:has-text("Next")');
        }

        return true;

    } catch (error) {
        logger.error('Failed to authenticate with Google:', error);
        throw new Error(`Google authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}