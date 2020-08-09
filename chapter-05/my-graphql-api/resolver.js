/**
 * 解析器文件
 * 主要是做数据获取工作
 * schema中的每个字段都可以映射到解析器
 * 对外暴露解析器对象，里面有schema根查询、变更等对应的同名属性，属性值为一个函数，在函数内完成真实的数据的获取和组装
 * 是客户端和服务器的一个中转站，数据在这一层按照schema指定的格式被组装并返回
 * 数据源可以是REST API 或者 数据库
*/

/**
 * 解析器函数定义
 * @param {Object} parent (父对象的引用，感觉一般是在)
 * @param {Object} args (查询、变更、订阅触发时传递的参数)
 * @param {Object} context (上下文对象 存储全局变量供解析器共享访问)
 * 
 * @return 返回shema指定格式的变量
*/
const { authorizeWithGithub } = require('./libs/request-github');

module.exports = {
    Query: {
        totalPhotos: (parent, args, { db }) => db.collection('photos').estimatedDocumentCount(),
        allPhotos: (parent, args, { db }) => db.collection('photos').find().toArray(),
        totalUsers: (parent, args, { db }) => db.collection('users').estimatedDocumentCount(),
        allUsers: (parent, args, { db }) => db.collection('users').find().toArray(),
        me: (parent, args, { currentUser }) => currentUser,
    },
    Mutation: {
        async postPhoto(parent, args, { db, currentUser }) {
            if (!currentUser) {
                throw new Error('Only authed users can post a photo');
            }
            const newPhoto = {
                ...args.input,
                userID: currentUser.githubLogin,
                created: +new Date(),
            };
            const { insertedId } = await db.collection('photos').insertOne(newPhoto);
            newPhoto.id = insertedId;
            return newPhoto;
        },
        githubAuth: async (parent, { code }, { db }) => {
            let { 
                message,
                access_token,
                avatar_url,
                login,
                name,
            } = await authorizeWithGithub({
                client_id: 'Iv1.efc331344ad84f85',
                client_secret: '5702b5b70f430632b7e5fd6ec445aa65e2690b52',
                code,
            });

            if (message) {
                throw new Error(message);
            }

            let latestUserInfo = {
                name,
                githubLogin: login,
                githubToken: access_token,
                avatar: avatar_url,
            }

            const  { ops:[ user ] } = await db
                .collection('users')
                .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true});

            return { user, token: access_token };
        },
        addFakeUsers: async (root, { count }, { db }) => {
            const randomUserApi = `https://randomuser.me/api/?results=${count}`;
            const { results } = await fetch(randomUserApi).then(res => res.json());

            const users = results.map(user => ({
                githubLogin: user.login.username,
                name: `${r.name.first} ${r.name.last}`,
                avatar: r.picture.thumbnail,
                githubToken: r.login.sha1
            }))

            await db.collection('users').insertOne(users);
            return users;
        }
    },
    // 自定义对象
    Photo: {
        id: parent => parent.id || parent._id,
        url: parent => `/img/photos/${parent.id}.jpg`,
        postedBy: async (parent, args, { db }) => {
            const user = await db.collection('users').findOne({ githubLogin: parent.userID});
            return user;
        },
        taggedUsers: parent => {
            return tags.filter(tag => tag.photoID === parent.id)
                    .map(item => item.userID)
                    .map(userID => {
                        return users.find(u => u.githubLogin === userID);
                    })
        }
    },
    User: {
        postedPhotos: parent => {
            return photos.filter(photo => photo.githubUser === parent.githubLogin);
        },
        inPhotos: parent => {
            return tags.filter(tag => tag.userID === parent.githubLogin)
                    .map(item => item.photoID)
                    .map(photo => {
                        return photos.find(p => p.id === photo);
                    })
        }
    }
};