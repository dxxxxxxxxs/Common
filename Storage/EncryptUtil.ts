import CryptoES from "crypto-es";

export class EncryptUtil {
    private static _key: string = "";
    private static _iv: CryptoES.lib.WordArray = null;

    //初始化加密库
    static initCrypto(key: string ,iv: string){
        this._key = key;
        this._iv = CryptoES.enc.Hex.parse(iv);
    }

    //MD5加密
    static md5(msg: string){
        return CryptoES.MD5(msg).toString();
    }

    //AES加密
    static aesEncrypt(msg: string , key?: string ,iv?: string){
        return CryptoES.AES.encrypt(
            msg,
            this._key,
            {
                iv: this._iv,
                format: this.JsonFormatter
            },
        ).toString();
    }

    //AES解密
    static aesDecrypt(str: string ,key?: string ,iv?: string){
        const decrypted = CryptoES.AES.decrypt(
            str,
            this._key,
            {
                iv: this._iv,
                format: this.JsonFormatter
            },
        );
        return decrypted.toString(CryptoES.enc.Utf8);
    }

    private static JsonFormatter = {
        stringify: function(cipherParams: any){
            const jsonObj: any = {ct: cipherParams.ciphertext.toString(CryptoES.enc.Base64)};
            if(cipherParams.iv){
                jsonObj.iv = cipherParams.iv.toString();
            }
            if(cipherParams.salt){
                jsonObj.s = cipherParams.salt.toString();
            }
            return JSON.stringify(jsonObj);
        },
        parse: function(jsonStr: any){
            const jsonObj = JSON.parse(jsonStr);
            const cipherParams = CryptoES.lib.CipherParams.create(
                {ciphertext:CryptoES.enc.Base64.parse(jsonObj.ct)},
            );
            if(jsonObj.iv){
                cipherParams.iv = CryptoES.enc.Hex.parse(jsonObj.iv);
            }
            if(jsonObj.s){
                cipherParams.salt = CryptoES.enc.Hex.parse(jsonObj.s);  
            }
            return cipherParams;
        }
    }
}