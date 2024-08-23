import { DEFAULT_PROVIDERS, ICommand } from "./commands";
import { DisposableStore } from "../utils";
import { authentication, AuthenticationGetSessionOptions, AuthenticationSession, CancellationTokenSource, commands, env, l10n, Memento, QuickPickItem, window } from "vscode";
import { getProvider, getScopeList, USE_CUSTOM_VALUE } from "../quickPicks";
import { IProviderQuickPickItem } from "../types";

class MintTokenCommand implements ICommand {

    id = 'fugio.mintToken';

    constructor(private readonly _globalState: Memento) {}

    async run(store: DisposableStore): Promise<void> {
        const disposable = store.add(new DisposableStore());
        const qp = disposable.add(window.createQuickPick());
        qp.totalSteps = 3;
        qp.title = 'Fugio Token Minting';
        qp.matchOnDescription = true;

        disposable.add(qp.onDidChangeValue((e: string) => {
            if (e.length) {
                qp.items.find(i => i.label === USE_CUSTOM_VALUE)!.description = e;
                qp.items = qp.items;
            }
        }));

        const cts = disposable.add(new CancellationTokenSource());
        disposable.add(qp.onDidHide(() => {
            disposable.dispose();
            cts.cancel();
        }));
        const recentProviders = this._globalState.get<IProviderQuickPickItem[]>('recent-providers') ?? [];
        const filteredDefaultProviders = DEFAULT_PROVIDERS.filter(provider => !recentProviders.some(recentProvider => recentProvider.label === provider.label));
        const allProviders = [...recentProviders, ...filteredDefaultProviders];

        let chosenProvider: QuickPickItem | undefined;
        let recentScopeLists: QuickPickItem[] | undefined;
        let chosenScopeList: QuickPickItem | undefined;
        do {
            if (cts.token.isCancellationRequested) {
                return;
            }
            chosenProvider = await getProvider(allProviders, qp);
            if (cts.token.isCancellationRequested) {
                return;
            }
            recentScopeLists = this._globalState.get<QuickPickItem[]>(`${chosenProvider.label}-scopelists`) ?? [];
            try {
                chosenScopeList = await getScopeList(recentScopeLists, qp, chosenProvider.label);
            } catch (e) {
                if (e === 'back') {
                    continue;
                }
                throw e;
            }
            if (cts.token.isCancellationRequested) {
                return;
            }
        } while (!chosenScopeList);
        
        const scopes = chosenScopeList.label.split(' ');
        
        const disposable2 = new DisposableStore();
        const qp2 = disposable2.add(window.createQuickPick<QuickPickItem & { id: keyof  Omit<AuthenticationGetSessionOptions, 'account'> }>());
        qp2.step = 3;
        qp2.totalSteps = 3;
        qp2.title = l10n.t('Fugio Token Minting');
        qp2.placeholder = l10n.t('Select options for token minting...');

        qp2.canSelectMany = true;
        qp2.items = [
            {
                label: l10n.t('Create If None'),
                id: 'createIfNone',
                picked: true,
            },
            {
                label: l10n.t('Clear Session Preference'),
                id: 'clearSessionPreference',
                picked: true,
            },
            {
                label: l10n.t('Force New Session'),
                id: 'forceNewSession',
            },
            {
                label: l10n.t('Silent'),
                id: 'silent'
            }
        ];
        qp2.selectedItems = qp2.items.filter(i => i.picked);
        disposable2.add(qp2.onDidHide(() => {
            disposable2.dispose();
        }));

        const resolvedOptions = new Promise<AuthenticationGetSessionOptions>((resolve, reject) => {
            disposable2.add(qp2.onDidAccept(() => {
                qp2.hide();
                const options: AuthenticationGetSessionOptions = {};
                for (const item of qp2.selectedItems) {
                    options[item.id] = true;
                }
                resolve(options);
            }));
        });
        qp2.show();

        const session = await authentication.getSession(chosenProvider.label, scopes, await resolvedOptions);

        await this._updateGlobalState(allProviders, chosenProvider, 'recent-providers');
        await this._updateGlobalState(recentScopeLists, chosenScopeList, `${chosenProvider.label}-scopelists`);

        if (!session) {
            await window.showInformationMessage(l10n.t('No token was available or was able to be minted.'));
            return;
        }

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
    }

    private async _updateGlobalState(recents: QuickPickItem[], chosenItem: QuickPickItem, key: string) {
        const indexToRemove = recents.findIndex(item => item.label === chosenItem.label);
        if (indexToRemove > -1) {
            recents.splice(indexToRemove, 1);
        }
        recents.unshift(chosenItem);
        if (recents.length > 10) {
            recents.splice(10, recents.length - 10);
        }
        await this._globalState.update(key, recents);
    }
}

export function registerMintTokenCommand(globalState: Memento, store: DisposableStore) {
    const mintTokenCommand = new MintTokenCommand(globalState);
    store.add(commands.registerCommand(mintTokenCommand.id, () => mintTokenCommand.run(store)));
}
