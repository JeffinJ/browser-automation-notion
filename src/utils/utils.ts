import { Browser, BrowserContext, chromium, Page } from "playwright";

/**
 * 
 * @param url - The URL to extract the workspace slug from.
 * @returns workspace slug or null if not found.
 */
export function getWorkspaceSlug(url: string): string | null {
    try {
        const host = new URL(url).host;
        const pathname = new URL(url).pathname
            .replace(/^\/+/, ""); // drop first "/"
        return pathname.split("/")[0] || null;
    } catch {
        return null;
    }
}


/**
 * Initializes a Playwright browser instance with a new context and page.
 * --disable-blink-features=AutomationControlled is used to prevent detection of automation.
 * @returns { browser: Browser; context: BrowserContext; page: Page }
 */
export async function initBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    return { browser, context, page };
}


/**
 * Logs messages to the console with a specific context name.
 * @param contextName - The name of the context for logging.
 * @returns 
 */
export function setupLogger(contextName: string) {
    return {
        info: (message: string, ...args: any[]) => {
            console.log(`[${contextName}-INFO] ${message}`, ...args);
        },
        error: (message: string, ...args: any[]) => {
            console.error(`[${contextName}-ERROR] ${message}`, ...args);
        },
        debug: (message: string, ...args: any[]) => {
            console.log(`[${contextName}-DEBUG] ${message}`, ...args);
        }
    };
}