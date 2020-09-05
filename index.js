const { request_lfasr_result } = require('./weblfasr_nodejs');

async function main() {
    await request_lfasr_result();
}

main()
    .then(console.log)
    .catch(console.error)