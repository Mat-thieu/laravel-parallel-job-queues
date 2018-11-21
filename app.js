const { spawn } = require( 'child_process' );
const { prompt } = require('enquirer');
const readline = require('readline');
const colors = require('colors');
const lowerCase = require('lodash.lowercase');

const fileExporer = require('./file-explorer');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));

let state = {
  path: '',
};

function spawnQueueWorker(name) {
  const term = spawn('bash');

  term.stdout.on('data', data => {
    if (lowerCase(data).includes('fail')) {
      return console.log(colors.cyan(`[${name}]`)+' '+colors.red(data.toString('utf8')));
    }
    if (lowerCase(data).includes('processed')) {
      return console.log(colors.cyan(`[${name}]`)+' '+colors.green(data.toString('utf8')))
    }
    if (lowerCase(data).includes('processing')) {
      return console.log(colors.cyan(`[${name}]`)+' '+colors.yellow(data.toString('utf8')))
    }
    console.log(colors.cyan(`[${name}]`)+`: ${data}`);
  });
  term.stderr.on('data', data => {
    if (lowerCase(data).includes('kill')) {
      term.kill('SIGKILL');
      console.log(colors.red(`[${name}]`)+': QUEUE CRASHED, RESTARTING');
      return spawnQueueWorker(name);
    }
    console.log(colors.red(`[${name}]`)+`: ${data}`);
  })

  term.on('close', code => console.log(colors.red(`[${name}]`)+` child process exited with code ${code}`));
  term.stdin.write(`cd ${state.path}\n`);
  term.stdin.write(`php artisan queue:work --queue=${name} \n`);

  console.log(colors.green(name+' queue running listening'));
}

fileExporer(state, spawnQueueWorker);

// async function start() {
//   const { queuename } = await prompt({
//     type: 'input',
//     name: 'queuename',
//     message: 'Queue name',
//   });
//   console.log({ queuename });

//   const { increment } = await prompt({
//     type: 'confirm',
//     name: 'increment',
//     message: 'Incremenet queue name?',
//   });
//   console.log({ increment });

//   if (increment) {
//     const { many } = await prompt({
//       type: 'input',
//       name: 'many',
//       message: 'How many?',
//     });
//     console.log({ many });
//   }

//   const { openexplorer } = await prompt({
//     type: 'select',
//     name: 'openexplorer',
//     message: 'Locate laravel project',
//     choices: [ 'Use file explorer', 'Insert path manually' ],
//   });

//   console.log({ openexplorer });
// }

// start();

