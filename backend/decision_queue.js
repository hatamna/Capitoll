const BILL_CODE_PATTERN = /^[cs]-\d+ ?\(\d+-\d+\)$/i;

class DecisionQueue {
    constructor(initialDecisions = []) {
        this.pending = [];
        initialDecisions.forEach(decision => this.enqueue(decision));
    }

    enqueue(decision) {
        const {
            parliamentNumber,
            sessionNumber,
            decisionDivisionNumber,
            billCode
        } = decision;

        if (!Number.isInteger(parliamentNumber) || parliamentNumber < 1 ||
            !Number.isInteger(sessionNumber) || sessionNumber < 1 ||
            !Number.isInteger(decisionDivisionNumber) || decisionDivisionNumber < 1 ||
            typeof billCode !== 'string' || !BILL_CODE_PATTERN.test(billCode)) {
            throw new TypeError('Invalid decision queue entry');
        }

        this.pending.push({
            parliamentNumber,
            sessionNumber,
            decisionDivisionNumber,
            billCode
        });
    }

    async drain(processDecision) {
        if (typeof processDecision !== 'function') {
            throw new TypeError('processDecision must be a function');
        }

        let processed = 0;
        while (this.pending.length > 0) {
            const decision = this.pending[0];
            await processDecision(decision);
            this.pending.shift();
            processed += 1;
        }

        return processed;
    }
}

module.exports = { DecisionQueue };