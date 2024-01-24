import { QuickPickItem } from "vscode";

export interface IProviderQuickPickItem extends QuickPickItem {
    requiredSetting?: string;
}
