'use strict';

const geminiService = require('./services/geminiService');
const { classifyPrompt, createIntentPlan } = require('./processors/PromptClassifier');
const { buildAnimationFromPlan, selectBuilder, BUILDER_MAP } = require('./builders/buildAnimationFromPlan');
const { validateAnimationPlan } = require('./validators/animationPlanValidator');
const { validateAnimationJSON } = require('./validators/animationValidator');
const { metrics, startTimer, endTimer, logGeminiCall, logFallback, logFailure } = require('./utils/metrics');

const TEST_PROMPTS = [
	'spinning square',
	'bouncing ball',
	'particle explosion',
	'two objects colliding',
	'city skyline animation'
];

const COVERAGE_PROMPTS = [
	'candlestick chart pattern',
	'show text "Hello world"',
	'orbiting planet around a star',
	'flowing ribbon',
	'chart data trend',
	'mystery abstract scene'
];

function createPlanFromClassification(prompt, classification) {
	return Object.assign({}, createIntentPlan(prompt, {
		type: classification.type,
		prompt
	}), {
		type: classification.type,
		prompt
	});
}

async function runScenario(prompt) {
	const classification = classifyPrompt(prompt);
	const simpleRoute = classification.complexity === 'simple';
	let geminiUsed = false;
	let fallbackUsed = false;
	let plan;

	if (simpleRoute) {
		console.log('SIMPLE_ROUTE_USED');
		plan = createPlanFromClassification(prompt, classification);
	} else {
		geminiUsed = true;
		console.log('GEMINI_USED');
		logGeminiCall();
		plan = Object.assign({}, await geminiService.generateAnimationPlan(prompt), {
			type: classification.type,
			prompt
		});
		fallbackUsed = Boolean(plan._fallbackUsed);
		if (fallbackUsed) {
			logFallback();
			if (plan._fallbackReason === 'jsonParse') {
				logFailure('jsonParse');
			}
		}
	}

	const planValidation = validateAnimationPlan(plan);
	if (!planValidation.valid) {
		logFailure('validator');
		fallbackUsed = true;
		plan = createPlanFromClassification(prompt, { type: 'unknown' });
		logFallback();
	}

	const selection = selectBuilder(plan);
	const animation = buildAnimationFromPlan(plan, prompt);
	const outputValidation = validateAnimationJSON(animation);

	return {
		prompt,
		type: classification.type,
		builder: selection.name,
		geminiUsed,
		fallbackUsed,
		planValid: planValidation.valid,
		outputValid: outputValidation.valid
	};
}

async function runAuditScenarios() {
	const startedAt = startTimer();
	const results = [];

	console.log('=== ROUTING AUDIT START ===');

	for (const prompt of TEST_PROMPTS) {
		const result = await runScenario(prompt);
		results.push(result);
		console.log('PROMPT:', result.prompt);
		console.log('DETECTED_TYPE:', result.type);
		console.log('BUILDER_USED:', result.builder);
		console.log('GEMINI_USED:', result.geminiUsed);
		console.log('FALLBACK_USED:', result.fallbackUsed);
		console.log('PLAN_VALID:', result.planValid);
		console.log('OUTPUT_VALID:', result.outputValid);
		console.log('---');
	}

	console.log('=== BUILDER COVERAGE PROBES ===');

	for (const prompt of COVERAGE_PROMPTS) {
		const result = await runScenario(prompt);
		results.push(result);
		console.log('COVERAGE_PROMPT:', result.prompt);
		console.log('COVERAGE_TYPE:', result.type);
		console.log('COVERAGE_BUILDER_USED:', result.builder);
		console.log('COVERAGE_GEMINI_USED:', result.geminiUsed);
		console.log('COVERAGE_FALLBACK_USED:', result.fallbackUsed);
		console.log('---');
	}

	const builderUsageSummary = Object.assign({}, metrics.builderUsageCounts);
	const neverUsedBuilders = Object.keys(BUILDER_MAP)
		.map(function (type) {
			return BUILDER_MAP[type].name;
		})
		.filter(function (builderName, index, list) {
			return list.indexOf(builderName) === index && !builderUsageSummary[builderName];
		});

	console.log('BUILDER_USAGE_SUMMARY:', JSON.stringify(builderUsageSummary));

	if (neverUsedBuilders.length > 0) {
		console.warn('BUILDERS_NEVER_USED:', neverUsedBuilders.join(', '));
	}

	const fallbackCount = results.filter(function (result) {
		return result.fallbackUsed;
	}).length;

	if (fallbackCount > 1) {
		console.warn('FALLBACK_TRIGGERED_TOO_OFTEN:', fallbackCount);
	}

	const simpleGeminiTypes = new Set(['basic_shape', 'bounce', 'float', 'orbit', 'text', 'flow']);
	const simpleGeminiMisuse = results.filter(function (result) {
		return result.geminiUsed && simpleGeminiTypes.has(result.type);
	});

	if (simpleGeminiMisuse.length > 0) {
		console.warn('GEMINI_USED_FOR_SIMPLE_PROMPTS:', simpleGeminiMisuse.map(function (result) {
			return result.prompt;
		}).join(' | '));
	}

	endTimer(startedAt);

	console.log('TOTAL_REQUESTS:', metrics.totalRequests);
	console.log('GEMINI_CALLS:', metrics.geminiCalls);
	console.log('FALLBACK_HITS:', metrics.fallbackHits);
	console.log('AVG_RESPONSE_TIME:', metrics.avgResponseTime);
	console.log('=== ROUTING AUDIT END ===');

	return results;
}

if (require.main === module) {
	runAuditScenarios().catch(function (err) {
		console.error('AUDIT_FAILED:', err);
		process.exitCode = 1;
	});
}

module.exports = {
	runAuditScenarios
};
