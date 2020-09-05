module.exports = class SliceIDGenerator {
    constructor() {
        this.__ch = 'aaaaaaaaa`';
    }

    getNextSliceId() {
        var ch = this.__ch;
        var j = ch.length - 1;
        while (j >= 0) {
            var cj = ch[j];
            if (cj != 'z') {
                ch = ch.substr(0, j) + String.fromCharCode(cj.charCodeAt(0) + 1) + ch.substr(j + 1);
                break;
            } else {
                ch = ch.substr(0, j) + 'a' + ch.substr(j + 1);
                j--;
            }
        }
        this.__ch = ch;
        return this.__ch;
    }

}