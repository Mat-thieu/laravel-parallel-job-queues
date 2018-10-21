const { spawn } = require( 'child_process' );
const inquirer = require('inquirer');
const Jetty = require('jetty');
const jetty = new Jetty(process.stdout);
const readline = require('readline');
const colors = require('colors');
const lowerCase = require('lodash.lowercase');

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

(
  async function getPath() {
    jetty.clear();
    jetty.moveTo([0,0]);
    let cursor = 0;
    let currentDirs = [];
    let path = ['~/'];

    const term = spawn('bash');
    term.stdin.write('cd ~\n');

    function render() {
      jetty.clear();
      jetty.moveTo([0,0]);
      jetty.text(colors.yellow('Select a Laravel project\n'));
      jetty.text(`Viewing ${path.join('')}\n\n [right] to view open directory\n [left] to view previous directory\n [enter] to use target directory\n\n`);
      currentDirs.forEach((row, index) => {
        row = row + '\n';
        if (cursor === index) row = colors.cyan('> '+row);
        jetty.text(row);
      });
    }

    function navigate() {
      term.stdin.write(`cd ${path.join('')}\n`);
      term.stdin.write('ls -d */\n');
      cursor = 0;
    }

    term.stdout.on('data', data => {
      currentDirs = data.toString('utf8').split('\n');
      currentDirs = currentDirs.slice(0, -1);
      render();
    });

    term.stdin.write('ls -d */\n');

    const handleKeypress = (str, key) => {
      if (key.ctrl && key.name === 'c') {
        return process.exit();
      }
      if (state.path) return;

      if (key.name === 'up') {
        if (cursor === 0) {
          cursor = (currentDirs.length - 1);
        }
        else {
          cursor -= 1;
        }
      }
      if (key.name === 'down') {
        if (cursor === (currentDirs.length - 1)) {
          cursor = 0;
        } else {
          cursor += 1;
        }
      }

      if (key.name === 'right') {
        path.push(currentDirs[cursor]);
        navigate();
      }
      if (key.name === 'left') {
        if (path.length > 1) {
          path = path.slice(0, -1);
          navigate();
        }
      }

      if (key.name === 'return') {
        jetty.clear();
        jetty.moveTo([0,0]);
        jetty.text(colors.green(`Selected ${path.join('')}${currentDirs[cursor]}\n\n`));
        state.path = `${path.join('')}${currentDirs[cursor]}`;

        for (var i = 0; i <= 4; i++) {
          spawnQueueWorker(`facebook-breakdown-${i}`);
        }
        return;
      }

      render();
    }

    process.stdin.on('keypress', handleKeypress);
  }
)();

