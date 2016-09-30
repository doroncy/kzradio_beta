var dust = require('dustjs-linkedin'),
    path = require('path'),
    fs = require('fs');

var dir = path.join(__dirname, 'views', 'templates'),
    writer = fs.createWriteStream(path.join(__dirname, '..', 'public', 'js', 'templates.js')),
    files = fs.readdirSync(dir);

files.forEach(function (file) {
    var name = path.basename(file, '.dust');
    if (name != file) {
        var str = fs.readFileSync(path.join(dir, file), 'utf8');
        writer.write(dust.compile(str, name));
    }
});

console.log('%d dust templates compiled.', files.length);
writer.end();
