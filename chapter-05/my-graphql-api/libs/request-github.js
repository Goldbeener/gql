const fetch = require('node-fetch');

const githubAuthUrl = 'https://github.com/login/oauth/access_token'; // 获取用户token
const githubUserUrl = 'https://api.github.com/user'; // 根据token获取用户信息
const authUrl = 'https://github.com/login/oauth/authorize?client_id=Iv1.efc331344ad84f85&scope=user'; // github 认证url

const toJson = res => res.json();
const throwError = error => {
    throw new Error(Json.stringify(error));
};

// get token from github
const requestGithubToken = credentials => {
    return fetch(githubAuthUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(credentials)
    })
    .then(toJson)
    .catch(throwError)
}

// get user from github
const requestGithubUserAccount = token => {
    return fetch(`${githubUserUrl}?access_token=${token}`)
        .then(toJson)
        .catch(throwError)
};

// get
async function authorizeWithGithub (credentials) {
    const { access_token } = await requestGithubToken(credentials);
    const githubUser = await requestGithubUserAccount(access_token);
    
    return {
        ...githubUser,
        access_token
    }
}


module.exports = {
    requestGithubToken,
    requestGithubUserAccount,
    authorizeWithGithub,
}