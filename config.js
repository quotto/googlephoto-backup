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

const config = {};

// The OAuth client ID from the Google Developers console.
config.oAuthClientID = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// The OAuth client secret from the Google Developers console.
config.oAuthclientSecret = 'xxxxxxxxxxxxxxxxxxxxx';

// The callback to use for OAuth requests. This is the URL where the app is
// running. For testing and running it locally, use 127.0.0.1.
config.oAuthCallbackUrl = 'http://127.0.0.1:9999/auth/google/callback';

// The port where the app should listen for requests.
config.port = 9999;

// The scopes to request. The app requires the photoslibrary.readonly and
// plus.me scopes.
config.scopes = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'profile',
];

// The page size to use for search requests. 100 is reccommended.
config.searchPageSize = 100;

// The API end point to use. Do not change.
config.apiEndpoint = 'https://photoslibrary.googleapis.com';

// The API end point to oauth2.0.
config.oauthEndpoint = 'https://accounts.google.com/o/oauth2';

// backup target MimeType
config.backupMimeType = [
    'image/bmp',
    'image/fif',
    'image/gif',
    'image/gif',
    'image/ief',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/tiff',
    'image/vasa',
    'image/vnd.rn-realpix',
    'image/vnd.wap.wbmp',
    'image/x-cmu-raster',
    'image/x-freehan',
    'image/x-icon',
    'image/x-jps',
    'image/x-portable-anymap',
    'image/x-portable-bitmap',
    'image/x-portable-graymap',
    'image/x-portable-pixmap',
    'image/x-rgb',
    'image/x-xbitmap',
    'image/x-xpixmap',
    'image/x-xres',
    'image/x-xwindowdump'
];

// backup target AlbumId
config.backupAlbumId = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// backup target target directory
config.backupDir = '/path/to/LocalDirectory'

module.exports = config;
