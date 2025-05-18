import { Config } from "../types/app.types";
import * as dotenv from 'dotenv';
dotenv.config();


export const notionConfig: Config = {
    googleEmail: process.env.GOOGLE_EMAIL,
    googlePassword: process.env.GOOGLE_PASSWORD,
    totpSecret: process.env.TOTP_SECRET,
    screenshotDir: 'screenshots/users-screen',
    notionLoginUrl: process.env.NOTION_LOGIN_URL || 'https://www.notion.com/login',
    headless: process.env.HEADLESS !== 'false'
};
