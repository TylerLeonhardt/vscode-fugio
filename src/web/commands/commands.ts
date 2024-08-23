import { IProviderQuickPickItem } from "../types";
import { DisposableStore } from "../utils";

export interface ICommand {
    id: string;
    run(store: DisposableStore): Promise<void>;
}

export const DEFAULT_PROVIDERS: IProviderQuickPickItem[] = [
    { label: 'github' },
    { label: 'microsoft' },
    { label: 'github-enterprise', requiredSetting: 'github-enterprise.uri' }
];
