const fs = require('fs');
const path = require('path');
const login = require('facebook-chat-api');
const readline = require('readline');
const minimist = require('minimist');
const dispatch = require('./lib/distributer.js');


let args = minimist(process.argv.slice(2), {
    string: ['email', 'pass', ],
    boolean: ['cli', 'version', 'help', 'restore-state', 'save-state'],
    alias: { v:'version', h:'help', p:'pass', e:'email' }
});

if (args.help) {
    console.log(`Description:
       A tool that logs different events coming from your facebook messanger (messages, typing, presence, attachments)
Usage:
       fcontrol [options]

Options:
       -e  --email        the email of your facebook acount
       -p  --pass         the password of your facebook acount
       --cli              use the tool only with command line arguments
       --restore-state    restore the state if a .appstate.json file is present
       --save-state       save the state of the app once logged in
       -h, --help         print usage information and exit
       -v, --version      show version info and exit`);
    process.exit(0);
}

if (args.version) {
    console.log('NodeJS: ' + process.version);
    console.log('FControl version: ' + fs.readFileSync(path.join(__dirname, 'version'), 'utf8'));
    process.exit(0);
}

if (args.cli){
    if(args['restore-state']) {

        if(!fs.existsSync(path.join(__dirname, '.appstate.json'))){
            console.log('No .appstate.json file found, plaese log in first.');
            process.exit(1);
        }
        initFacebookChat('', '', true, true);

    } else {

        if(!args.email || !args.pass){
            console.log('You must provide email and password.');
            process.exit(1);
        }

        initFacebookChat(args.email, args.pass, args['save-state'], false);
    }
} else {

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    if (fs.existsSync(path.join(__dirname, '.appstate.json'))) {
        rl.question('Restore app state(y/n): ', (yn) => {
            initFacebookChat('', '', true, true);
        });
    } else {
        promtLogin(rl);
    }
}


function promtLogin(rl) {

    rl.question('Facebook Email adress: ', (name) => {
        rl.stdoutMuted = true;
        rl.query = 'Password : ';
        rl.question(rl.query, (pass) => {
            console.log('\n');
            initFacebookChat(name, pass, true, false);
            rl.history = rl.history.slice(1);
            rl.close();
        });
        rl._writeToOutput = function _writeToOutput(stringToWrite) {
            if (rl.stdoutMuted)
                rl.output.write('\x1B[2K\x1B[200D'+rl.query+'['+((rl.line.length%2==1)?'=-':'-=')+']');
            else
                rl.output.write(stringToWrite);
        };
    });

}

function initFacebookChat(email, pass, saveState, restoreState){
    var loginInfo;

    if (!restoreState) {
        loginInfo ={email: email, password: pass};
    } else {
        loginInfo = {appState: JSON.parse(fs.readFileSync(path.join(__dirname,'.appstate.json'), 'utf8'))};
    }

    login(loginInfo, (err, api) => {

        if(err) {
            console.log('Some error :/');
            console.log(err);
        }

        if (saveState)
            fs.writeFileSync('.appstate.json', JSON.stringify(api.getAppState()));

        api.setOptions({
            logLevel: 'silent',
            updatePresence: true,
            selfListen : true,
            listenEvents: true
        });

        api.listen((err, event) => {
            if(err) return console.error(err);
            dispatch.process(event, api);
        });

    });

}
