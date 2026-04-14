'use strict';

const metrics = {
	totalRequests: 0,
	geminiCalls: 0,
	fallbackHits: 0,
	avgResponseTime: 0,
	validatorFailures: 0,
	jsonParseFailures: 0,
	timeoutCount: 0,
	builderUsageCounts: Object.create(null),
	_responseTimeTotal: 0,
	_responseTimeSamples: 0
};

function startTimer() {
	metrics.totalRequests += 1;
	return Date.now();
}

function endTimer(startTime) {
	if (!Number.isFinite(startTime)) {
		return metrics.avgResponseTime;
	}

	const elapsed = Date.now() - startTime;
	metrics._responseTimeTotal += elapsed;
	metrics._responseTimeSamples += 1;
	metrics.avgResponseTime = metrics._responseTimeTotal / metrics._responseTimeSamples;
	return elapsed;
}

function logGeminiCall() {
	metrics.geminiCalls += 1;
}

function logFallback() {
	metrics.fallbackHits += 1;
}

function logBuilder(name) {
	const key = String(name || 'unknown');
	metrics.builderUsageCounts[key] = (metrics.builderUsageCounts[key] || 0) + 1;
}

function logBuilderUsage(name) {
	logBuilder(name);
}

function logTimeout() {
	metrics.timeoutCount += 1;
}

function logFailure(type) {
	const failureType = String(type || 'unknown');

	if (failureType === 'validator') {
		metrics.validatorFailures += 1;
		return;
	}

	if (failureType === 'jsonParse') {
		metrics.jsonParseFailures += 1;
		return;
	}

	if (failureType === 'timeout') {
		logTimeout();
		return;
	}

	metrics[failureType + 'Failures'] = (metrics[failureType + 'Failures'] || 0) + 1;
}

module.exports = {
	metrics,
	startTimer,
	endTimer,
	logGeminiCall,
	logFallback,
	logBuilder,
	logBuilderUsage,
	logFailure,
	logTimeout
};
