import auth from './auth.js'
import live from './live.js'
import user from './user.js'
import sign from './sign.js'
import video from './video.js'
class BApi {
    constructor() {}
}
Object.assign(BApi.prototype, auth, live, user, sign, video)
export default new BApi()
