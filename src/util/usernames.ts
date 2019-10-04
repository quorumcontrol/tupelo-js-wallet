import { EcdsaKey, Tupelo, ChainTree } from "tupelo-wasm-sdk"
import { getAppCommunity } from "./appcommunity"

export const usernameKey = "/_wallet/username"
export const namespace = Buffer.from("_wallet-dev")

/**
 * Generates a public/private keypair from an *insecure* passphrase.
 * This method is used to generate a ChainTree with a known name (given a namespace)
 * The very first thing you do with the ChainTree should be to ChangeOwner
 * @param userName - the username
 */
export const publicUserKey = (userName: string) => {
    return EcdsaKey.passPhraseKey(Buffer.from(userName), namespace)
}

export const didFromUserName = async (userName: string) => {
    const userKey = await publicUserKey(userName)
    return Tupelo.ecdsaPubkeyToDid(userKey.publicKey)
}

export const getUserTree = async (userName: string) => {
    const c = await getAppCommunity()
    const userDid = await didFromUserName(userName)
    let userTip
    try {
        userTip = await c.getTip(userDid)
    } catch(e) {
        throw e
    }

    return new ChainTree({
        store: c.blockservice,
        tip: userTip
    })
}
