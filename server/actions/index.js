'use strict';

/* Registri action. Nama key HARUS sama persis dengan nama action app Muse
   dan dengan segmen URL: POST /api/<namaAction>. */

const { getMonthData } = require('./getMonthData');
const {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} = require('./transactions');
const { createWallet, deleteWallet, updateWallet } = require('./wallets');
const {
  createTransfer,
  deleteTransfer,
  updateTransfer,
} = require('./transfers');
const { setBudget } = require('./budgets');

const ACTIONS = {
  getMonthData,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createWallet,
  updateWallet,
  deleteWallet,
  createTransfer,
  updateTransfer,
  deleteTransfer,
  setBudget,
};

module.exports = { ACTIONS };
