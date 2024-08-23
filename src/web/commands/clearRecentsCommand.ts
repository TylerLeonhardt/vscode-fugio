import { commands, Memento, QuickPickItem } from "vscode";
import { DisposableStore } from "../utils";
import { ICommand } from "./commands";

class ClearRecentsCommand implements ICommand {
    id = 'fugio.clearRecents';
    constructor(private readonly _globalState: Memento) {}

    async run(store: DisposableStore): Promise<void> {
        const recentProviders = this._globalState.get<QuickPickItem[]>('recent-providers');
        if (!recentProviders?.length) {
            return;
        }

        for (const provider of recentProviders) {
            await this._globalState.update(`${provider.label}-scopelists`, undefined);
        }

        await this._globalState.update('recent-providers', undefined);
    }
}

export function registerClearRecentsCommand(globalState: Memento, store: DisposableStore): void {
    const clearRecentsCommand = new ClearRecentsCommand(globalState);
    store.add(commands.registerCommand(clearRecentsCommand.id, () => clearRecentsCommand.run(store)));
}
