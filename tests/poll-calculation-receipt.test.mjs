import test from "node:test";
import assert from "node:assert/strict";
import {pollCalculationReceipt} from "../src/poll-calculation-receipt.js";
test("receipt exposes exact equal-institute weights, stale exclusions and missing values",()=>{
  const polls=[{date:"2026-01-01",pollster:"a",results:{x:30,y:9}}, {date:"2026-02-01",pollster:"a",results:{x:20}}, {date:"2026-02-02",pollster:"b",results:{x:40,y:8}}, {date:"2025-10-01",pollster:"c",results:{x:80}}, {date:"2026-03-01",pollster:"d",results:{x:99}}];
  const receipt=pollCalculationReceipt(polls,["a","b","c","d"],"2026-02-02",["x","y"],{a:"Institute A",b:"Institute B"});
  assert.equal(receipt.institutes,2);assert.equal(receipt.parties.x.value,30);assert.equal(receipt.parties.y.value,8);
  assert.deepEqual(receipt.parties.y.weights,[{instituteId:"b",weight:1}]);
  assert.equal(receipt.polls[0].institute,"Institute A");assert.equal(receipt.polls[0].commissioner,null);
});
