
import { Community, ChainTree } from 'tupelo-wasm-sdk';
import CID from 'cids';
import debug from 'debug';
import { Transaction } from 'tupelo-messages';

const log = debug("appcommunity")

let _appPromise: Promise<Community>

export function getAppCommunity(): Promise<Community> {
    log("getAppCommunity")
    if (_appPromise !== undefined) {
        return _appPromise
    }
    _appPromise = new Promise(async (resolve, reject) => {
        let c: Community
        switch (process.env.NODE_ENV) {
            case 'production':
                log('using production community')
                c = await Community.getDefault()
                break;
            default:
                log('using development community')
                c = await Community.freshLocalTestCommunity()
        }
        resolve(c)
    })
    return _appPromise
}

export async function txsWithCommunityWait(tree:ChainTree, txs:Transaction[]) {
    const c = await getAppCommunity()
    const res = await c.playTransactions(tree, txs)
    const sig = res.getSignature()
    if (sig === undefined) {
        throw new Error("undefined sig from response")
    }
    const respTip = new CID(Buffer.from(sig.getNewTip_asU8()))

    const treeId = await tree.id()
    if (treeId === null) {
        throw new Error("error getting ID, was null")
    }

    await waitForCommunityTip(treeId, respTip)
    return res
}


// for some reason can't use CID as a type here easily
export function waitForCommunityTip(did:string, tip:CID) {
    return new Promise((resolve,reject)=> {   
        log("waiting for community on ", did) 
        let count = 0
        const doCheck = async ()=> {
            const c = await getAppCommunity()
            log("waitForCommunityTip: awaitng nextUpdate")
            await c.nextUpdate()
            log("waitForCommunityTip: getTip")
            let cTip:CID
            try {
                cTip = await c.getTip(did)
            } catch(e) {
                if (e === 'not found') {
                    setTimeout(doCheck, 200)
                    return
                }
                throw new Error(e)
            }
            if (tip.equals(cTip)) {
                log("tips matched", did) 
                resolve()
                return
            }
            if (count > 60) {
                log("waitForCommunityTip: rejecting timeout ", did)
                reject(new Error("timeout error, over 30s"))
                return
            }
            count++
            log('tips did not match, retrying', did)
            setTimeout(doCheck, 500)
        }
        doCheck()
    })
}