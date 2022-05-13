import {ArbitrageBot} from "./ArbitrageBot";
import {container, singleton} from "tsyringe";
import {ArbitrageProfile} from "./config/arbitrage-profile";
import Web3 from "web3";

const path = require('path');
const fs = require('fs-extra');

@singleton()
export class BotManager {
    private readonly _web3: Web3;
    private readonly _bots = new Map<string, ArbitrageBot>();
    private readonly _tokenSupportedBots = new Map<string, string[]>();
    private readonly _taskAssignedBots = new Map<string, string>();

    constructor() {
        this._web3 = container.resolve("Web3");
    }

    addBot(bot: ArbitrageBot) {
        const botId = bot.address;
        if (!this._bots.has(botId)) {
            this._bots.set(botId, bot);
            const supportedTokens = bot.supportedTokens();
            for (const token of supportedTokens) {
                if (this._tokenSupportedBots.has(token)) {
                    this._tokenSupportedBots.set(
                        token,
                        [...this._tokenSupportedBots.get(token), botId]
                    )
                } else {
                    this._tokenSupportedBots.set(token, [botId]);
                }
            }
        }
    }

    getTokenSupportedBots(token: string): ArbitrageBot[] {
        if (this._tokenSupportedBots.has(token)) {
            const botIds = this._tokenSupportedBots.get(token);
            return botIds.map(botId => this._bots.get(botId));
        } else {
            return [];
        }
    }

    assignToTask(botId: string, taskId: string): boolean {
        if (this._taskAssignedBots.has(botId)) {
            return false;
        } else {
            this._taskAssignedBots.set(botId, taskId);
            return true;
        }
    }

    releaseFromTask(botId: string) {
        return this._taskAssignedBots.delete(botId);
    }

    getAvailableBotsFor(token: string): ArbitrageBot[] {
        if (!this._tokenSupportedBots.has(token)) {
            return [];
        }
        const supportedBots = this._tokenSupportedBots.get(token);
        const ret: ArbitrageBot[] = [];
        for (const botId of supportedBots) {
            if (!this._taskAssignedBots.has(botId)) {
                ret.push(this._bots.get(botId));
            }
        }
        return ret;
    }

    loadConfiguredBots(jksPassword: string): boolean {
        const profile: ArbitrageProfile = container.resolve("ArbitrageProfile");
        try {
            for (const bot of profile.Bots) {
                const jksFilePath = path.join(__dirname, "..", "data/__accounts", bot.jksFile);
                const jks = fs.readJSONSync(jksFilePath);
                const privateKey = this._web3.eth.accounts.decrypt(jks, jksPassword).privateKey
                this.addBot(new ArbitrageBot(
                    privateKey,
                    bot.supportedTokens.map(v => v.toLowerCase())
                ))
            }
            return true;
        } catch (e) {
            console.error(`Load configured bots failed: ${e.toString()}`);
            return false;
        }
    }

}