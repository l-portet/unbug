const { program } = require('commander');

class Animal {
  race = 'dog';

  greet() {
    console.log('woof');
  }
}

let foo = 'fooval';
let bar = { a: 42 };
let animal = new Animal();
let arr = ['a', 'b', 'c', []];
let fn = arg1 => 'hello ' + arg1;

program.name('foo');

// debugger;

console.log(foo);
console.log(bar);
console.log(animal);
console.log(arr);
console.log(fn);
console.log(program);

// Keep process alive
setInterval(() => {}, 1 << 30);
