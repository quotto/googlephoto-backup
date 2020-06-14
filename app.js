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

const fs = require('fs')
const request = require('request-promise')
const path = require('path')
const piexif = require('piexifjs');
const winston = require('winston');
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({level,message,label,timestamp})=>{
            return `${timestamp}[${level}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: 'backup.log'})
    ]
});

const config = require('./config');

// Exifデータの挿入
// metadata:Google Photos APIから取得したMediaItemのmedaData.Photo
// jpeg_data: 対象画像のbufferデータ
const insertExif = (metadata,jpeg_data) =>{
    const exifObj = piexif.load(jpeg_data.toString('binary'));
    const zeroth = {};
    const exif = {};
    const gps = {};
    if(metadata.photo.cameraMake) exifObj["0th"][piexif.ImageIFD.Make] = metadata.photo.cameraMake;
    if(metadata.photo.cameraMake) exifObj["0th"][piexif.ImageIFD.Make] = metadata.photo.cameraMake;
    if(metadata.photo.cameraModel) exifObj["0th"][piexif.ImageIFD.Model] = metadata.photo.cameraModel;
    if(metadata.width) exifObj["0th"][piexif.ImageIFD.ImageWidth] = Number(metadata.width);
    if(metadata.height) exifObj["0th"][piexif.ImageIFD.ImageLength] = Number(metadata.height);
    if(metadata.photo.focalLength) exifObj["Exif"][piexif.ExifIFD.FocalLength] = metadata.photo.focalLength;
    if(metadata.photo.apertureFNumber) exifObj["Exif"][piexif.ExifIFD.FNumber] = metadata.photo.apertureFNumber;
    if(metadata.photo.isoEquivalent) exifObj["Exif"][piexif.ExifIFD.ISOSpeedRatings] = metadata.photo.isoEquivalent;
    if(metadata.photo.exposureTime) exifObj["Exif"][piexif.ExifIFD.ExposureTime] = metadata.photo.exposureTime;
    const creationTime = new Date(metadata.creationTime);
    const year = creationTime.getFullYear();
    const month = creationTime.getMonth() < 9 ? `0${creationTime.getMonth()+1}`:String(creationTime.getMonth()+1);
    const date = creationTime.getDate() < 10 ? `0${creationTime.getDate()}`:creationTime.getDate();
    const hour = creationTime.getHours() < 10 ? `0${creationTime.getHours()}`:creationTime.getHours();
    const minute = creationTime.getMinutes() < 10 ? `0${creationTime.getMinutes()}`:creationTime.getMinutes();
    const second = creationTime.getSeconds() < 10 ? `0${creationTime.getSeconds()}`:creationTime.getSeconds();
    exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = `${year}:${month}:${date} ${hour}:${minute}:${second}`;

    const exifStr = piexif.dump(exifObj);

    return new Buffer(piexif.insert(exifStr,jpeg_data.toString('binary')), 'binary');
}

// 取得済みのaccess_tokenをリフレッシュする
const refreshToken = async ()=>{
    if(Date.now() >= credential.expires) {
        logger.info('token refresh');
        try {
            const res = await request.post(config.oauthEndpoint+"/token",{
                headers:{'Content-Type': 'application/json'},
                json: {
                    client_id: config.oAuthClientID,
                    client_secret: config.oAuthclientSecret,
                    refresh_token: credential.refreshToken,
                    grant_type: 'refresh_token'
                }
            })
            credential.token = res.access_token;
            credential.expires = Date.now() + (res.expires_in * 1000);
            fs.writeFileSync('credential',JSON.stringify(credential));
            logger.info(JSON.stringify(credential));
        } catch(err) {
            logger.error(err.message)
        }
    }
}

// 画像データのダウンロード処理
// media_item:MediaItemオブジェクト
const downloadImage = (media_item)=>{
    return new Promise((resolve,reject)=>{
        // ファイル名はid+元々のファイルの拡張子とする
        const filename = media_item.id + media_item.filename.substring(media_item.filename.lastIndexOf('.'));
        const saveFile = path.join(config.backupDir,filename);
        fs.stat(saveFile,(err,stat)=>{
            if(!stat) {
                //ファイルが存在しなければダウンロード処理を開始する
                const metadata = media_item.mediaMetadata;
                const rawdataUrl = `${media_item.baseUrl}=d`
                logger.info(`download:${filename} from ${rawdataUrl}`)

                request({url:rawdataUrl,encoding: null,method: 'GET'},(err,res,body)=>{
                    if(err) {
                        logger.error('file request error');
                        logger.error(err);
                        reject();
                    }
                    // rawdataからはExif情報が含まれないためJPEGであればAPIから取得したメタデータをよりExif情報を設定する
                    const data = media_item.mimeType.toLowerCase() === 'image/jpeg' ? insertExif(metadata,body) : body;
                    fs.writeFile(saveFile,data,{encoding:'buffer'},(err)=>{
                        if(err) {
                            logger.error('file write error');
                            logger.error(err);
                            fs.unlink(saveFile);
                            reject();
                        }
                        resolve();
                    });
                });
            } else {
                //ファイルが既に存在すれば何もせず完了
                resolve();
            }
        });
    });
}

// backup本体
const backup = async ()=>{
    // credentialが無ければ終了
    if(!credential || !credential.token || !credential.refreshToken || !credential.expires) {
        logger.error('credential is not set');
        return;
    }

    await refreshToken();
    try {
        const album = await request.get(`${config.apiEndpoint}/v1/albums/${config.backupAlbumId}`,{
            headers: {'Content-Type': 'application/json'},
            json: true,
            auth: {'bearer':credential.token}
        });
        const item_count = Number(album.mediaItemsCount);
        const iterate = Math.ceil(item_count/config.searchPageSize);
        let next_page_token = '';

        // 対象アルバムの全画像を100件ずつ取得する
        for(let i=0; i<iterate; i++) {
            await refreshToken();
            logger.info(`iterate:${(i+1)}/${iterate}`);
            const parameter = {albumId:config.backupAlbumId, pageSize:config.searchPageSize};
            if(next_page_token) {
                parameter.pageToken = next_page_token;
            }
            const items = await request.post(`${config.apiEndpoint}/v1/mediaItems:search`,{
                headers: {'Content-Type': 'application/json'},
                json: parameter,
                auth: {'bearer':credential.token}
            });

            if(items && items.mediaItems) {
                const downloadAsyncJob = [];

                items.mediaItems.forEach((media_item)=>{
                    // 対象のMIMETYPEに一致するメディアのみダウンロード処理実行
                    if(config.backupMimeType.indexOf(media_item.mimeType.toLowerCase()) >= 0) {
                        downloadAsyncJob.push(downloadImage(media_item));
                    }
                });

                // 1リクエスト最大100回の並列ダウンロードが終わるまで待機
                await Promise.all(downloadAsyncJob);
                next_page_token = items.nextPageToken;
            }
            await new Promise((resolve,reject)=>{
                setTimeout(()=>{
                    resolve();
                },1000)
            })
        }
    } catch (err) {
        logger.error(err.message);
    }
}

logger.info("start backup");

// 保存したaccess_token、refresh_token、expiresを読み出す
const credential = JSON.parse(fs.readFileSync('credential'));
backup().then(()=>{
    logger.info("done");
});
