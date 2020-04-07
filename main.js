import { a } from 'test';
import Vue from 'vue';
console.log(a);

console.log(Vue);

importShim('vue').then(data => {
  console.log(" == ", data);
})
