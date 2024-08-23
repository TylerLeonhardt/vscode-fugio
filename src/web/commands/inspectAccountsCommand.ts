import { authentication, AuthenticationSessionAccountInformation, commands, env, l10n, Memento, QuickInputButton, QuickPickItem, QuickPickItemKind, ThemeIcon, window } from "vscode";
import { DEFAULT_PROVIDERS, ICommand } from "./commands";
import { IProviderQuickPickItem } from "../types";
import { DisposableStore } from "../utils";

class InspectAccountsCommand implements ICommand {
    id = 'fugio.inspectAccounts';
    constructor(private readonly _globalState: Memento) {}

    async run(store: DisposableStore): Promise<void> {
        const recentProviders = this._globalState.get<IProviderQuickPickItem[]>('recent-providers') ?? [];
        const filteredDefaultProviders = DEFAULT_PROVIDERS.filter(provider => !recentProviders.some(recentProvider => recentProvider.label === provider.label));
        const allProviders = [...recentProviders, ...filteredDefaultProviders];

        const filteredProviders = await window.showQuickPick(allProviders, {
            canPickMany: true,
            placeHolder: 'Select providers to inspect accounts for'
        });
        if (!filteredProviders) {
            return;
        }

        const button: QuickInputButton = {
            iconPath: new ThemeIcon('gear'),
            tooltip: 'Mint a new token'
        };
        type AccountItem = QuickPickItem & { provider: string, account: AuthenticationSessionAccountInformation };
        const items: AccountItem[] = [];
        for (const provider of filteredProviders) {
            const accounts = await authentication.getAccounts(provider.label);
            if (accounts.length) {
                items.push({ kind: QuickPickItemKind.Separator, label: provider.label, provider: '', account: { id: '', label: '' } });
                items.push(...accounts.map(account => ({
                    label: account.label,
                    description: '' + account.id,
                    provider: provider.label,
                    buttons: [button],
                    account
                })));
            }
        }

        const disposable = store.add(new DisposableStore());
        const qp = disposable.add(window.createQuickPick<AccountItem>());
        qp.title = 'Fugio Account Inspection';
        qp.matchOnDescription = true;
        qp.items = items;
        disposable.add(qp.onDidTriggerItemButton(async (e) => {
            disposable.dispose();
            const result = await window.showInputBox({
                prompt: l10n.t('Enter the scopes you want to mint a token for, separated by spaces.'),
                placeHolder: 'scopeA scopeB scopeC...',
                title: l10n.t('Fugio Token Minting'),
                ignoreFocusOut: true
            });
            if (!result) {
                return;
            }
            const session = await authentication.getSession(e.item.provider!, result.split(' '), { createIfNone: true, clearSessionPreference: true, account: e.item.account });
            const copyAccess = l10n.t('Copy access token');
            const copyId = l10n.t('Copy id token');
            const buttons = (session as any).idToken ? [copyAccess, copyId] : [copyAccess];
            let copyResult: string | undefined;
            do {
                copyResult = await window.showInformationMessage(`Your token for scopes "${session.scopes.join(' ')}" is ready!`, ...buttons);
                if (copyResult === copyAccess) {
                    env.clipboard.writeText(session.accessToken);
                } else if (copyResult === copyId) {
                    env.clipboard.writeText((session as any).idToken);
                }
                if (!(session as any).idToken) {
                    copyResult = undefined;
                }
            } while (copyResult);
        }));
        qp.show();
    }
}

export function registerInspectAccountsCommand(globalState: Memento, store: DisposableStore): void {
    const inspectAccountsCommand = new InspectAccountsCommand(globalState);
    store.add(commands.registerCommand(inspectAccountsCommand.id, () => inspectAccountsCommand.run(store)));
}
