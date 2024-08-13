const FormData = require('form-data')
module.exports = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('immich-uploader', {
      handle,
      name: 'immich 图床',
      config: config
    })
  }
  const handle = async function (ctx) {
    let userConfig = ctx.getConfig('picBed.immich-uploader')
    if (!userConfig) {
      throw new Error('Can\'t find uploader config')
    }
    const host = userConfig.host
    const apiKey = userConfig.apiKey
    const albumId = userConfig.albumId
    try {
      let imgList = ctx.output
      for (let i in imgList) {
        let image = imgList[i].buffer
        if (!image && imgList[i].base64Image) {
          image = Buffer.from(imgList[i].base64Image, 'base64')
        }
        const fileName = imgList[i].fileName
        const uploadConfig = uploadOptions(image, host, apiKey, fileName, ctx)
        let body = await ctx.Request.request(uploadConfig)
        let picId = body.id

        if (albumId !== null && albumId !== undefined && albumId.trim() !== '') {
          const addPicToAlbumConfig = addPicToAlbumOptions(picId, albumId, host, apiKey, ctx)
          await ctx.Request.request(addPicToAlbumConfig)
        }
        const shardLinkConfig = shardLinkOptions(picId, host, apiKey)
        let shardLinkBody = await ctx.Request.request(shardLinkConfig)
        imgList[i].imgUrl = host + '/api/assets/' + picId + '/thumbnail?size=preview&key=' + shardLinkBody.key
      }
    } catch (err) {
      ctx.log.info(err)
      ctx.emit('notification', {
        title: '上传失败',
        body: err
      })
    }
  }

  const uploadOptions = (image, host, apiKey, fileName, ctx) => {
    let formData = new FormData()
    const currentDate = new Date()
    const formattedDate = currentDate.toISOString()
    const deviceAssetId = ('picgo-' + fileName + '-' + image.length).replaceAll(/\s+/g, '')
    formData.append('deviceAssetId', deviceAssetId)
    formData.append('deviceId', 'picgo')
    formData.append('fileSize', String(image.length))
    formData.append('fileCreatedAt', formattedDate)
    formData.append('fileModifiedAt', formattedDate)
    formData.append('assetData', image, fileName)
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: host + '/api/assets',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
        'x-api-key': apiKey,
        ...formData.getHeaders()
      },
      data: formData
    }
    return config
  }

  const addPicToAlbumOptions = (picId, albumId, host, apiKey, ctx) => {
    let data = JSON.stringify({
      'ids': [
        picId
      ]
    })
    let config = {
      method: 'put',
      maxBodyLength: Infinity,
      url: host + '/api/albums/' + albumId + '/assets',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      data: data
    }
    return config
  }

  const shardLinkOptions = (picId, host, apiKey) => {
    let data = JSON.stringify({
      'allowDownload': false,
      'allowUpload': false,
      'showMetadata': false,
      'assetIds': [
        picId
      ],
      'description': '',
      'password': '',
      'type': 'INDIVIDUAL'
    })
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: host + '/api/shared-links',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      data: data
    }
    return config
  }

  const config = ctx => {
    let userConfig = ctx.getConfig('picBed.immich-uploader')
    if (!userConfig) {
      userConfig = {}
    }
    return [
      {
        name: 'host',
        type: 'input',
        default: userConfig.host,
        required: true,
        message: 'immich 地址',
        alias: 'immich 地址'
      },
      {
        name: 'apiKey',
        type: 'input',
        default: userConfig.apiKey,
        required: true,
        message: 'immich api key',
        alias: 'immich api key'
      },
      {
        name: 'albumId',
        type: 'input',
        default: userConfig.albumId,
        required: false,
        message: 'immich album id',
        alias: 'immich album id'
      }
    ]
  }
  return {
    uploader: 'immich-uploader',
    register
  }
}
