// Learn TypeScript:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/2.4/manual/en/scripting/life-cycle-callbacks.html

import GameModel from "../../Scripts/Model/GameModel";
import BundleManager from "../Bundle/BundleManager";
import { Game } from "../Game";


const { ccclass, property } = cc._decorator;

@ccclass
export class AudioManager {
    private static _instance: AudioManager;
    public static get Instance() {
        if (this._instance == null) {
            this._instance = new AudioManager();
        }
        return this._instance as AudioManager;
    }
    private constructor() { }
    private static audioSource?: cc.AudioSource
    private soundVolume: number = 1;
    private musicVolume: number = 1;
    /**
     * 初始化音乐组件（全局一般只有一个音乐节点，只会初始化一次）
     * @param audioSource 音乐节点身上的AudioSource组件
     */
    init(audioSource: cc.AudioSource) {
        AudioManager.audioSource = audioSource;
    }
    /**
     * 播放音乐
     * @param {Boolean} loop 是否循环播放
     */
    playMusic(name: string, bundleName = "Audio") {
        const audioSource = AudioManager.audioSource;
        let uiBundle: cc.AssetManager.Bundle;
        const complete = () => {
            uiBundle.load(name, cc.AudioClip, (err, clip) => {
                if (err) {
                    console.error('load audioClip failed: ', err);
                    return;
                }
                const playByGame = () => {
                    cc.audioEngine.setMusicVolume(audioSource.volume ? this.musicVolume / audioSource.volume : 0);
                    cc.audioEngine.playMusic(clip as cc.AudioClip, true);
                };
                playByGame();
            });
        }
        if (Game.bundles.get(bundleName)) {
            uiBundle = Game.bundles.get(bundleName);
            complete();
        } else {
            cc.assetManager.loadBundle(bundleName, (err, bundle) => {
                if (!err) {
                    Game.bundles.set(bundleName, bundle);
                    uiBundle = bundle;
                    complete();
                    console.log("bundles中没有当前分包，设置进去");
                };
            })
        }


    }

    stopMusic(bundle?) {
        cc.audioEngine.stopMusic();
    }

    /**
     * 播放音效
     * @param {String} name 音效名称可通过AudioSound 获取
     */
    playSound(name: string, bundleName = "Audio") {
        const audioSource = AudioManager.audioSource;
        let uiBundle: cc.AssetManager.Bundle;
        const complete = () => {
            uiBundle.load(name, cc.AudioClip, (err, clip) => {
                if (err) {
                    console.error('load audioClip failed: ', err);
                    return;
                }
                const playByGame = () => {
                    cc.audioEngine.setEffectsVolume(audioSource.volume ? this.soundVolume / audioSource.volume : 0);
                    cc.audioEngine.playEffect(clip as cc.AudioClip, false);
                };
                playByGame();
            });
        }
        if (Game.bundles.get(bundleName)) {
            uiBundle = Game.bundles.get(bundleName);
            complete();
        } else {
            cc.assetManager.loadBundle(bundleName, (err, bundle) => {
                if (!err) {
                    Game.bundles.set(bundleName, bundle);
                    uiBundle = bundle;
                    complete();
                    console.log("bundles中没有当前分包，设置进去");
                };
            })
        }
    }

    setMusicVolume(flag: number) {
        this.musicVolume = flag;
        cc.audioEngine.setMusicVolume(flag);
        Game.Storage.setWXItem("music", flag);
    }

    setSoundVolume(flag: number) {
        this.soundVolume = flag;
        cc.audioEngine.setEffectsVolume(flag);
        Game.Storage.setWXItem("sound", flag);
    }

    openMusic() {
        this.setMusicVolume(1);
    }

    closeMusic() {
        this.setMusicVolume(0);
    }

    openSound() {
        this.setSoundVolume(1);
    }

    closeSound() {
        this.setSoundVolume(0);
    }
}
