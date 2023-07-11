var Condition = require('./condition');

class Throttler {
  constructor(maxPending) {
    this.maxPending = maxPending;
    this.pendingCount = 0;
    this.full = new Condition();
  }

  async wait() {
    while (this.pendingCount >= this.maxPending) {
      await this.full.wait();
    }
    this.pendingCount++;
  }

  notify() {
    this.pendingCount--;
    this.full.notifyOne();
  }
}

module.exports = Throttler;
