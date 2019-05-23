// Copyright 2019 quotto

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const fs = require('fs');
const request = require('request-promise');
const config = require('./config');
const express = require('express')
const bodyParser = require('body-parser');
const http = require('http')
const app = express();
const server = http.Server(app);

app.get('/auth/google/callback',(req,res)=>{
    request.post(`${config.oauthEndpoint}/token`,{
        headers:{'Content-Type': 'application/json'},
        json: {
            code: req.query.code,
            client_id: config.oAuthClientID,
            client_secret: config.oAuthclientSecret,
            redirect_uri: config.oAuthCallbackUrl,
            grant_type: 'authorization_code'
        }
    }).then((data)=>{
        res.send('Oauth process succeed.Please back to app console.');
        res.end();
        fs.open('credential','w',(err,fd)=>{
            const authenticate_data = {
                token: data.access_token,
                refreshToken: data.refresh_token,
                expires: Date.now() + (data.expires_in * 1000)
            }
            fs.writeSync(fd,JSON.stringify(authenticate_data)) ;
            console.log('Oauth process succeed.');
            console.log('Press Ctrl-C and run application.');
        });
    })
})

server.listen(config.port,()=>{
    const scope = config.scopes.join('%20');
    const oauth_url = `${config.oauthEndpoint}/auth?client_id=${config.oAuthClientID}&redirect_uri=${config.oAuthCallbackUrl}&response_type=code&scope=${scope}&access_type=offline`
    console.log('Please access this URL:');
    console.log(oauth_url);
})
