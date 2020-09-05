const utf8 = require('utf8');
const md5 = require('md5');
const HmacSha1 = require('hmac_sha1');
const hmacSha1 = new HmacSha1('base64');
const fs = require('fs');
const path = require('path');
const qs = require('querystring');
const axios = require('axios');
const SliceIDGenerator = require('./slice_id_generator');
const FormData = require('form-data');
const Str = require('@supercharge/strings')
const delay = require('delay');
const { start } = require('repl');



const lfasr_host = 'http://raasr.xfyun.cn';
// 讯飞开放平台的appid和secret_key
const app_id = '5f50a611';
const secret_key = 'a26853160d2aaf95a350e71b1e0e93bc';
// 请求的接口名
const api_prepare = '/prepare';
const api_upload = '/upload';
const api_merge = '/merge';
const api_get_progress = '/getProgress';
const api_get_result = '/getResult';
// 文件分片大下52k
const file_piece_sice = 10485760;
// 要是转写的文件路径
const uplaod_file_path = './audio/audios_bf946d7e-2d44-40f0-abab-5493edf73d77.wav';

const base_header = { 'Content-type': 'application/x-www-form-urlencoded', 'Accept': 'application/json;charset=utf-8' };

// ——————————————————转写可配置参数————————————————
// 转写类型
const lfasr_type = 0;
// 是否开启分词
const has_participle = 'false';
// 多候选词个数
const max_alternatives = 0;
// 子用户标识
const suid = '';

const getRandomString = function(randomChars, length) {
    var result = '';
    for (var i = 0; i < length; i++) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}
const prepare = async function() {
    return await lfasr_post(api_prepare, qs.stringify(await generate_request_param(api_prepare)), base_header);
}

const upload = async function(taskid) {
    try {
        var index = 0;
        var sig = new SliceIDGenerator();
        var file_len = await fs.statSync(uplaod_file_path).size;
        while (true) {
            var start_pos = file_piece_sice * index;
            var end_pos = Math.min(file_piece_sice * (index + 1) - 1, file_len - 1)
            var content = fs.createReadStream(uplaod_file_path, { start: start_pos, end: end_pos });
            var response = await post_multipart_formdata(await generate_request_param(api_upload, taskid, sig.getNextSliceId()), content);
            if (response['ok'] != 0) {
                // 上传分片失败
                console.log(`uplod slice fail, response: ${response['failed']}`);
                return false;
            }
            content.close();
            console.log(`upload slice ${index + 1} success`);
            if (file_piece_sice * (index + 1) >= file_len) break;
            index++;
        }
    } catch (e) {
        content.close();
        console.log(e.message);
        return false;
    }
    return true;
}

const merge = async function(taskid) {
    return await lfasr_post(api_merge, qs.stringify(await generate_request_param(api_merge, taskid)), base_header);
}

const get_progress = async function(taskid) {
    return await lfasr_post(api_get_progress, qs.stringify(await generate_request_param(api_get_progress, taskid)), base_header);
}

const get_result = async function(taskid) {
    return await lfasr_post(api_get_result, qs.stringify(await generate_request_param(api_get_result, taskid)), base_header);
}

const lfasr_post = async function(apiname, requestbody, header) {
    var config = {
        method: 'post',
        url: `${lfasr_host}/api${apiname}`,
        headers: header,
        data: requestbody,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    }
    var response = await axios(config);
    return response.data;
}

const post_multipart_formdata = async function(strparams, content) {
    // var BOUNDARY = `----------${getRandomString('0123456789abcdef', 15)}`;
    // var multi_header = { 'Content-type': `multipart/form-data; boundary=${BOUNDARY}`, 'Accept': 'application/json;charset=utf-8' };
    // var CRLF = '\r\n';
    // var L = [];

    // for (var key of Object.keys(strparams)) {
    //     L.push(`--${BOUNDARY}`);
    //     L.push(`Content-Disposition: form-data; name="${key}"`);
    //     L.push('')
    //     L.push(strparams[key])
    // }

    // L.push(`--${BOUNDARY}`);
    // L.push(`Content-Disposition: form-data; name="content"; filename="${strparams['slice_id']}"`);
    // L.push('Content-Type: application/octet-stream');
    // L.push('');
    // L.push(content);
    // L.push(`--${BOUNDARY}--`);
    // L.push('');

    // var body = L.join(CRLF);
    // var data = lfasr_post(api_upload, body, multi_header);
    // return data;

    var data = new FormData();
    for (var key of Object.keys(strparams)) {
        data.append(key, strparams[key]);
    }
    data.append('content', content, { filename: strparams['slice_id'] });

    return await lfasr_post(api_upload, data, {...data.getHeaders() });
}

const generate_request_param = async function(apiname, taskid = null, slice_id = null) {
    var ts = Math.floor(Date.now() / 1000).toString();
    var tmp = app_id + ts;
    var hl = md5(utf8.encode(tmp));
    var signa = hmacSha1.digest(secret_key, hl);

    var file_len = await fs.statSync(uplaod_file_path).size;
    var file_name = path.basename(uplaod_file_path);
    var slice_num = Math.floor(file_len / file_piece_sice) + (file_len % file_piece_sice == 0 ? 0 : 1);

    param_dict = {};
    if (apiname == api_prepare) {
        param_dict['app_id'] = app_id;
        param_dict['signa'] = signa;
        param_dict['ts'] = ts;
        param_dict['file_len'] = file_len.toString();
        param_dict['file_name'] = file_name;
        param_dict['lfasr_type'] = lfasr_type.toString();
        param_dict['slice_num'] = slice_num.toString();
        param_dict['has_participle'] = has_participle;
        param_dict['max_alternatives'] = max_alternatives.toString();
        param_dict['suid'] = suid;
    } else if (apiname == api_upload) {
        param_dict['app_id'] = app_id;
        param_dict['signa'] = signa;
        param_dict['ts'] = ts;
        param_dict['task_id'] = taskid;
        param_dict['slice_id'] = slice_id;
    } else if (apiname == api_merge) {
        param_dict['app_id'] = app_id;
        param_dict['signa'] = signa;
        param_dict['ts'] = ts;
        param_dict['task_id'] = taskid;
        param_dict['file_name'] = file_name;
    } else if (apiname == api_get_progress || apiname == api_get_result) {
        param_dict['app_id'] = app_id;
        param_dict['signa'] = signa;
        param_dict['ts'] = ts;
        param_dict['task_id'] = taskid;
    }
    return param_dict;
}
module.exports = {
    request_lfasr_result: async() => {
        // 1.预处理
        var prepare_result = await prepare();
        if (prepare_result['ok'] != 0) {
            console.log(`prepare error, ${pr}`);
            return;
        }

        var taskid = prepare_result['data'];
        console.log(`prepare success, taskid: ${taskid}`);

        // 2.分片上传文件
        if (await upload(taskid))
            console.log('uplaod success');
        else
            console.log('uoload fail');

        // 3.文件合并
        var merge_result = await merge(taskid)
        if (merge_result['ok'] != 0) {
            console.log('merge fail,', merge_result);
            return
        }
        // 4.获取任务进度
        while (true) {
            // 每隔20秒获取一次任务进度
            var progress_dic = await get_progress(taskid)
            if (progress_dic['err_no'] != 0 && progress_dic['err_no'] != 26605) {
                console.log(`task error: ${progress_dic['failed']}`);
                return;
            } else {
                var task_status = JSON.parse(progress_dic['data']);
                if (task_status['status'] == 9) {
                    console.log(`task ${taskid} finished`);
                    break;
                }
                console.log(`The task ${taskid} is in processing, task status: `, task_status);
            }

            // 每次获取进度间隔20S
            await delay(20000);
        }

        // 5. 获取结果
        lfasr_result = await get_result(taskid);
        console.log(`result: ${lfasr_result['data']}`);
    }
}