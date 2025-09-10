// Demo data and basic app logic for Monad Explorer Lite

const AppState = {
	rpcUrl: null,
	mode: 'demo', // 'demo' | 'rpc'
	latestBlockNumber: 0,
	blocks: [], // { number, hash, time, txs: [{hash, from, to, value}], confirmations }
	badges: new Set(),
	score: 0,
	clickedBlocks: new Set(), // Track which blocks have been clicked
	wallet: {
		connected: false,
		address: null,
		provider: null,
		type: null, // 'metamask' | 'walletconnect' | 'coinbase' | etc.
	},
};

const els = {
	searchInput: document.getElementById('searchInput'),
	searchBtn: document.getElementById('searchBtn'),
	blocksRail: document.getElementById('blocksRail'),
	results: document.getElementById('results'),
	badges: document.getElementById('badges'),
	scoreValue: document.getElementById('scoreValue'),
	connectWallet: document.getElementById('connectWallet'),
	walletInfo: document.getElementById('walletInfo'),
	walletAddress: document.getElementById('walletAddress'),
	disconnectWallet: document.getElementById('disconnectWallet'),
};

function formatTimeAgo(ms) {
	const s = Math.floor((Date.now() - ms) / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60); return `${h}h ago`;
}

function randomHex(bytes) {
	const chars = '0123456789abcdef';
	let out = '0x';
	for (let i = 0; i < bytes * 2; i++) out += chars[Math.floor(Math.random() * 16)];
	return out;
}

function generateDemoBlock(n) {
	// Occasionally generate special blocks for badges (15% chance - increased)
	const isSpecialBlock = Math.random() < 0.15;
	
	let txCount, txs;
	
	if (isSpecialBlock) {
		// Generate special block based on random badge type
		const badgeType = Math.floor(Math.random() * 3);
		
		if (badgeType === 0) {
			// Contract Creator block
			txCount = 2 + Math.floor(Math.random() * 2);
			txs = Array.from({ length: txCount }).map(() => ({
				hash: randomHex(32),
				from: randomHex(20),
				to: Math.random() < 0.5 ? null : randomHex(20), // Higher chance for contract creation
				value: (Math.random() * 1.2).toFixed(3),
			}));
		} else if (badgeType === 1) {
			// Whale block
			txCount = 1 + Math.floor(Math.random() * 2);
			txs = Array.from({ length: txCount }).map(() => ({
				hash: randomHex(32),
				from: randomHex(20),
				to: randomHex(20),
				value: (2.1 + Math.random() * 2).toFixed(3), // Values > 2.0 MON
			}));
		} else {
			// Rapid Fire block
			txCount = 4 + Math.floor(Math.random() * 3); // 4-6 transactions
			txs = Array.from({ length: txCount }).map(() => ({
				hash: randomHex(32),
				from: randomHex(20),
				to: randomHex(20),
				value: (Math.random() * 1.2).toFixed(3),
			}));
		}
	} else {
		// Normal block
		txCount = 1 + Math.floor(Math.random() * 3); // 1-3 transactions
		txs = Array.from({ length: txCount }).map(() => ({
			hash: randomHex(32),
			from: randomHex(20),
			to: Math.random() < 0.02 ? null : randomHex(20), // Very rare contract creation
			value: (Math.random() * 1.2).toFixed(3), // Values up to 1.2 MON
		}));
	}
	
	const block = {
		number: n,
		hash: randomHex(32),
		time: Date.now(),
		txs,
		confirmations: 0,
	};
	
	// Mark special blocks with their badge type
	if (isSpecialBlock) {
		const badgeType = Math.floor(Math.random() * 3);
		if (badgeType === 0) {
			block.badgeType = 'contract-creator';
		} else if (badgeType === 1) {
			block.badgeType = 'whale';
		} else {
			block.badgeType = 'rapid-fire';
		}
	}
	
	return block;
}

function updateConfirmations() {
	const latest = AppState.latestBlockNumber;
	for (const b of AppState.blocks) {
		b.confirmations = Math.max(0, latest - b.number);
	}
}

function renderBlocks() {
	els.blocksRail.innerHTML = '';
	for (const b of AppState.blocks.slice(0, 30)) {
		const card = document.createElement('div');
		card.className = 'block-card';
		
		// Determine block status based on confirmations
		const statusClass = b.confirmations >= 6 ? 'confirmed' : b.confirmations >= 1 ? 'pending' : 'new';
		const statusIcon = b.confirmations >= 6 ? '✅' : b.confirmations >= 1 ? '⏳' : '🆕';
		const statusText = b.confirmations >= 6 ? 'Confirmed' : b.confirmations >= 1 ? 'Pending' : 'New';
		
		// Check if this is a badge-worthy block
		const isBadgeBlock = b.badgeType;
		const badgeIcon = isBadgeBlock ? '🏆' : '';
		const badgeClass = isBadgeBlock ? 'badge-worthy' : '';
		
		// Count transaction statuses
		const txCounts = b.txs.reduce((acc, tx) => {
			const status = tx.status || 'success';
			acc[status] = (acc[status] || 0) + 1;
			return acc;
		}, {});
		
		card.innerHTML = `
			<div class="block-header">
				<div class="block-number">${badgeIcon} Block #${b.number}</div>
				<div class="block-status ${statusClass}">
					${statusIcon} ${statusText}
				</div>
			</div>
			<div class="block-meta mono">${b.hash.slice(0, 12)}… • ${formatTimeAgo(b.time)}</div>
			<div class="block-stats">
				<div class="tx-count">${b.txs.length} txs</div>
				${b.miner ? `<div class="miner-info">Miner: ${b.miner.slice(0, 8)}...</div>` : ''}
			</div>
			<div class="confirmations">
				<div class="confirmation-label">Confirmations:</div>
				<div class="confirmation-dots">${renderDots(Math.min(b.confirmations, 12))}</div>
			</div>
			<div class="tx-status-indicators">
				${txCounts.success ? `<span class="tx-status success">✅ ${txCounts.success}</span>` : ''}
				${txCounts.failed ? `<span class="tx-status failed">❌ ${txCounts.failed}</span>` : ''}
				${txCounts.pending ? `<span class="tx-status pending">⏳ ${txCounts.pending}</span>` : ''}
			</div>
			${isBadgeBlock ? `<div class="badge-hint">🏆 Click to earn badge!</div>` : ''}
		`;
		
		// Add click handler to search for this block and check for badges
		card.addEventListener('click', () => {
			els.searchInput.value = b.number.toString();
			onSearch();
			
			// Handle scoring
			handleBlockClick(b);
			
			// Check if this block can earn a badge
			if (b.badgeType) {
				evaluateBadgeOnClick(b);
			}
		});
		
		els.blocksRail.appendChild(card);
	}
}

function renderDots(active) {
	let html = '';
	for (let i = 0; i < 12; i++) html += `<div class="dot${i < active ? ' active' : ''}"></div>`;
	return html;
}

async function renderResults(entity) {
	if (!entity) { els.results.innerHTML = ''; return; }
	
	if (entity.type === 'block') {
		const b = entity.block;
		const miner = b.miner || 'Unknown';
		const totalGasUsed = b.txs.reduce((sum, tx) => sum + (tx.gasUsed || 0), 0);
		
		els.results.innerHTML = `
			<div class="card block-detail">
				<div class="result-header">
					<h3>📦 Block #${b.number}</h3>
					<div class="status-badge confirmed">✅ Confirmed</div>
				</div>
				<div class="result-details">
					<div class="detail-row">
						<span class="label">Hash:</span>
						<span class="mono value">${b.hash}</span>
					</div>
					<div class="detail-row">
						<span class="label">Timestamp:</span>
						<span class="value">${formatTimeAgo(b.time)}</span>
					</div>
					<div class="detail-row">
						<span class="label">Miner:</span>
						<span class="mono value">${miner}</span>
					</div>
					<div class="detail-row">
						<span class="label">Transactions:</span>
						<span class="value">${b.txs.length}</span>
					</div>
					<div class="detail-row">
						<span class="label">Gas Used:</span>
						<span class="value">${totalGasUsed.toLocaleString()}</span>
					</div>
				</div>
			</div>
			<div class="card-list">
				<h4>Transactions in this block:</h4>
				${b.txs.map(tx => `
					<div class="card transaction-card">
						<div class="tx-header">
							<span class="mono tx-hash">${tx.hash.slice(0, 12)}...${tx.hash.slice(-8)}</span>
							<span class="status-badge ${tx.status === 'success' ? 'confirmed' : tx.status === 'failed' ? 'failed' : 'pending'}">
								${tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'} ${tx.status}
							</span>
						</div>
						<div class="tx-details">
							<div class="tx-flow">
								<span class="mono from">${tx.from.slice(0, 8)}...${tx.from.slice(-6)}</span>
								<span class="arrow">→</span>
								<span class="mono to">${tx.to ? tx.to.slice(0, 8) + '...' + tx.to.slice(-6) : '(contract creation)'}</span>
							</div>
							<div class="tx-meta">
								<span class="value">${tx.value} MON</span>
								${tx.gasUsed ? `<span class="gas">Gas: ${tx.gasUsed.toLocaleString()}</span>` : ''}
							</div>
						</div>
					</div>
				`).join('')}
			</div>
		`;
	} else if (entity.type === 'tx') {
		const tx = entity.tx;
		const statusColor = tx.status === 'success' ? 'confirmed' : tx.status === 'failed' ? 'failed' : 'pending';
		const statusIcon = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';
		
		els.results.innerHTML = `
			<div class="card transaction-detail">
				<div class="result-header">
					<h3>💸 Transaction</h3>
					<div class="status-badge ${statusColor}">${statusIcon} ${tx.status}</div>
				</div>
				<div class="result-details">
					<div class="detail-row">
						<span class="label">Hash:</span>
						<span class="mono value">${tx.hash}</span>
					</div>
					<div class="detail-row">
						<span class="label">From:</span>
						<span class="mono value">${tx.from}</span>
					</div>
					<div class="detail-row">
						<span class="label">To:</span>
						<span class="mono value">${tx.to || '(contract creation)'}</span>
					</div>
					<div class="detail-row">
						<span class="label">Value:</span>
						<span class="value">${tx.value} MON</span>
					</div>
					${tx.gasUsed ? `
					<div class="detail-row">
						<span class="label">Gas Used:</span>
						<span class="value">${tx.gasUsed.toLocaleString()}</span>
					</div>
					` : ''}
					${tx.gasPrice ? `
					<div class="detail-row">
						<span class="label">Gas Price:</span>
						<span class="value">${(tx.gasPrice / 1e9).toFixed(2)} Gwei</span>
					</div>
					` : ''}
					${tx.blockNumber ? `
					<div class="detail-row">
						<span class="label">Block:</span>
						<span class="value">#${tx.blockNumber}</span>
					</div>
					` : ''}
				</div>
			</div>
		`;
	} else if (entity.type === 'address') {
		const addr = entity.address;
		
		// Fetch balance and transactions for this address
		let balance = '0.000000';
		let transactions = [];
		
		if (AppState.mode === 'rpc') {
			try {
				balance = await fetchWalletBalance(addr);
				transactions = await fetchWalletTransactions(addr);
			} catch (error) {
				console.error('Failed to fetch address data:', error);
			}
		} else {
			// Demo mode - count transactions from cache
			const sent = [];
			const received = [];
			for (const b of AppState.blocks) {
				for (const t of b.txs) {
					if (t.from.toLowerCase() === addr.toLowerCase()) sent.push(t);
					if (t.to && t.to.toLowerCase() === addr.toLowerCase()) received.push(t);
				}
			}
			transactions = [...sent, ...received].slice(0, 10);
		}
		
		els.results.innerHTML = `
			<div class="card address-detail">
				<div class="result-header">
					<h3>👤 Address</h3>
					<div class="status-badge confirmed">✅ Active</div>
				</div>
				<div class="result-details">
					<div class="detail-row">
						<span class="label">Address:</span>
						<span class="mono value">${addr}</span>
					</div>
					<div class="detail-row">
						<span class="label">Balance:</span>
						<span class="value">${balance} MON</span>
					</div>
					<div class="detail-row">
						<span class="label">Transactions:</span>
						<span class="value">${transactions.length} found</span>
					</div>
				</div>
			</div>
			${transactions.length > 0 ? `
			<div class="card-list">
				<h4>Recent transactions:</h4>
				${transactions.map(tx => `
					<div class="card transaction-card">
						<div class="tx-header">
							<span class="mono tx-hash">${tx.hash.slice(0, 12)}...${tx.hash.slice(-8)}</span>
							<span class="status-badge ${tx.status === 'success' ? 'confirmed' : tx.status === 'failed' ? 'failed' : 'pending'}">
								${tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳'} ${tx.status}
							</span>
						</div>
						<div class="tx-details">
							<div class="tx-flow">
								<span class="mono from">${tx.from.slice(0, 8)}...${tx.from.slice(-6)}</span>
								<span class="arrow">→</span>
								<span class="mono to">${tx.to ? tx.to.slice(0, 8) + '...' + tx.to.slice(-6) : '(contract creation)'}</span>
							</div>
							<div class="tx-meta">
								<span class="value">${tx.value} MON</span>
								${tx.blockNumber ? `<span class="block-ref">Block #${tx.blockNumber}</span>` : ''}
							</div>
						</div>
					</div>
				`).join('')}
			</div>
			` : ''}
		`;
	}
}

function renderBadges() {
	const badgeList = Array.from(AppState.badges);
	if (!badgeList.length) { els.badges.innerHTML = '<div class="block-meta">No badges yet. Hunt for patterns!</div>'; return; }
	els.badges.innerHTML = badgeList.map(b => badgeToHtml(b)).join('');
}

function updateScore() {
	els.scoreValue.textContent = AppState.score.toLocaleString();
}

function handleBlockClick(block) {
	const blockId = block.number;
	
	// Check if this block has been clicked before
	if (AppState.clickedBlocks.has(blockId)) {
		showNotification(`📦 Block #${blockId} already clicked!\nNo points awarded.`, 'info');
		return;
	}
	
	// Mark block as clicked
	AppState.clickedBlocks.add(blockId);
	
	// Calculate points
	let points = 10; // Base points for clicking any block
	let bonusReason = '';
	
	// Bonus points for special blocks
	if (block.badgeType) {
		points += 50; // Bonus for badge-worthy blocks
		bonusReason = ' +50 bonus for badge-worthy block!';
	}
	
	// Bonus for high transaction count
	if (block.txs.length >= 4) {
		points += 20;
		bonusReason += ' +20 for busy block!';
	}
	
	// Bonus for large transactions
	const maxValue = Math.max(...block.txs.map(tx => parseFloat(tx.value)));
	if (maxValue > 1.0) {
		points += Math.floor(maxValue * 10);
		bonusReason += ` +${Math.floor(maxValue * 10)} for large transaction!`;
	}
	
	// Update score
	AppState.score += points;
	updateScore();
	
	// Show score notification
	showNotification(`🎯 +${points} points!\n📦 Block #${blockId}${bonusReason}`, 'success');
}

function badgeToHtml(b) {
	const map = {
		'contract-creator': { label: 'Contract Creator', emoji: '🏗️' },
		'whale': { label: 'Whale Watcher', emoji: '🐋' },
		'rapid-fire': { label: 'Rapid Fire', emoji: '⚡' },
	};
	const m = map[b] || { label: b, emoji: '🏅' };
	return `<span class="badge"><span class="emoji">${m.emoji}</span> ${m.label}</span>`;
}

function evaluateBadgeOnClick(clickedBlock) {
	const previousBadgeCount = AppState.badges.size;
	
	// Award badge based on the block's badge type
	if (clickedBlock.badgeType) {
		AppState.badges.add(clickedBlock.badgeType);
		
		// Check if this was a new badge
		if (AppState.badges.size > previousBadgeCount) {
			const badgeNames = {
				'contract-creator': 'Contract Creator',
				'whale': 'Whale Watcher', 
				'rapid-fire': 'Rapid Fire'
			};
			const badgeDescriptions = {
				'contract-creator': 'Witnessed contract deployment',
				'whale': 'Spotted large transaction (>2.0 MON)',
				'rapid-fire': 'Found busy block (4+ transactions)'
			};
			showNotification(`🏆 Badge Earned: ${badgeNames[clickedBlock.badgeType]}!\n📦 Block #${clickedBlock.number} - ${badgeDescriptions[clickedBlock.badgeType]}`, 'success');
		} else {
			// Badge already earned
			showNotification(`🏆 Block #${clickedBlock.number} was badge-worthy!\nBut you already have this badge.`, 'info');
		}
	}
	
	renderBadges();
}

function pushBlock(block) {
	AppState.blocks.unshift(block);
	AppState.latestBlockNumber = Math.max(AppState.latestBlockNumber, block.number);
	updateConfirmations();
	renderBlocks();
}

function startDemoStream() {
	if (AppState._demoInterval) clearInterval(AppState._demoInterval);
	// Seed blocks
	AppState.blocks = [];
	AppState.latestBlockNumber = 1000 + Math.floor(Math.random() * 5000);
	for (let i = 0; i < 8; i++) pushBlock(generateDemoBlock(AppState.latestBlockNumber - i));
	// Realtime new block every 5s
	AppState._demoInterval = setInterval(() => {
		pushBlock(generateDemoBlock(++AppState.latestBlockNumber));
	}, 5000);
}

async function connectRpc(url) {
	try {
		// Test the RPC connection
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_blockNumber',
				params: [],
				id: 1
			})
		});
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const data = await response.json();
		if (data.error) {
			throw new Error(data.error.message);
		}
		
		AppState.rpcUrl = url;
		AppState.mode = 'rpc';
		AppState.latestBlockNumber = parseInt(data.result, 16);
		
		// Start fetching real blocks
		await fetchLatestBlocks();
		startRpcStream();
		
		return true;
	} catch (error) {
		console.error('RPC connection failed:', error);
		throw error;
	}
}

async function rpcCall(method, params = []) {
	if (AppState.mode !== 'rpc' || !AppState.rpcUrl) {
		throw new Error('RPC not connected');
	}
	
	const response = await fetch(AppState.rpcUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			method,
			params,
			id: Date.now()
		})
	});
	
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}
	
	const data = await response.json();
	if (data.error) {
		throw new Error(data.error.message);
	}
	
	return data.result;
}

async function fetchLatestBlocks() {
	try {
		const latestBlockNumber = await rpcCall('eth_blockNumber');
		const latestNum = parseInt(latestBlockNumber, 16);
		
		// Fetch last 8 blocks
		const blocks = [];
		for (let i = 0; i < 8; i++) {
			const blockNum = latestNum - i;
			const block = await fetchBlock(blockNum);
			if (block) blocks.push(block);
		}
		
		AppState.blocks = blocks.reverse();
		AppState.latestBlockNumber = latestNum;
		updateConfirmations();
		renderBlocks();
	} catch (error) {
		console.error('Failed to fetch latest blocks:', error);
	}
}

async function fetchBlock(blockNumber) {
	try {
		const blockHex = '0x' + blockNumber.toString(16);
		const blockData = await rpcCall('eth_getBlockByNumber', [blockHex, true]);
		
		if (!blockData) return null;
		
		const transactions = blockData.transactions || [];
		const txs = transactions.map(tx => ({
			hash: tx.hash,
			from: tx.from,
			to: tx.to,
			value: (parseInt(tx.value, 16) / 1e18).toFixed(6),
			gasUsed: tx.gas ? parseInt(tx.gas, 16) : 0,
			gasPrice: tx.gasPrice ? parseInt(tx.gasPrice, 16) : 0,
			status: tx.status || 'pending'
		}));
		
		return {
			number: parseInt(blockData.number, 16),
			hash: blockData.hash,
			time: parseInt(blockData.timestamp, 16) * 1000,
			miner: blockData.miner,
			txs,
			confirmations: 0
		};
	} catch (error) {
		console.error(`Failed to fetch block ${blockNumber}:`, error);
		return null;
	}
}

async function fetchTransaction(txHash) {
	try {
		const txData = await rpcCall('eth_getTransactionByHash', [txHash]);
		if (!txData) return null;
		
		const receipt = await rpcCall('eth_getTransactionReceipt', [txHash]);
		
		return {
			hash: txData.hash,
			from: txData.from,
			to: txData.to,
			value: (parseInt(txData.value, 16) / 1e18).toFixed(6),
			gasUsed: receipt ? parseInt(receipt.gasUsed, 16) : 0,
			gasPrice: parseInt(txData.gasPrice, 16),
			status: receipt ? (parseInt(receipt.status, 16) === 1 ? 'success' : 'failed') : 'pending',
			blockNumber: txData.blockNumber ? parseInt(txData.blockNumber, 16) : null,
			blockHash: txData.blockHash
		};
	} catch (error) {
		console.error(`Failed to fetch transaction ${txHash}:`, error);
		return null;
	}
}

async function fetchWalletBalance(address) {
	try {
		const balance = await rpcCall('eth_getBalance', [address, 'latest']);
		return (parseInt(balance, 16) / 1e18).toFixed(6);
	} catch (error) {
		console.error(`Failed to fetch balance for ${address}:`, error);
		return '0.000000';
	}
}

async function fetchWalletTransactions(address) {
	try {
		// This would require an indexer API or scanning blocks
		// For now, return transactions from our current block cache
		const txs = [];
		for (const block of AppState.blocks) {
			for (const tx of block.txs) {
				if (tx.from.toLowerCase() === address.toLowerCase() || 
					tx.to.toLowerCase() === address.toLowerCase()) {
					txs.push({ ...tx, blockNumber: block.number, blockTime: block.time });
				}
			}
		}
		return txs.slice(0, 10); // Return last 10 transactions
	} catch (error) {
		console.error(`Failed to fetch transactions for ${address}:`, error);
		return [];
	}
}

function startRpcStream() {
	if (AppState._rpcInterval) clearInterval(AppState._rpcInterval);
	
	AppState._rpcInterval = setInterval(async () => {
		try {
			const latestBlockNumber = await rpcCall('eth_blockNumber');
			const latestNum = parseInt(latestBlockNumber, 16);
			
			if (latestNum > AppState.latestBlockNumber) {
				const newBlock = await fetchBlock(latestNum);
				if (newBlock) {
					pushBlock(newBlock);
				}
			}
		} catch (error) {
			console.error('RPC stream error:', error);
		}
	}, 2000); // Check every 2 seconds
}

async function parseQuery(q) {
	q = q.trim();
	if (!q) return null;
	
	if (/^\d+$/.test(q)) {
		const n = parseInt(q, 10);
		// Check if we have this block in cache
		const block = AppState.blocks.find(b => b.number === n);
		if (block) return { type: 'block', block };
		
		// Fetch from RPC if connected
		if (AppState.mode === 'rpc') {
			try {
				const fetchedBlock = await fetchBlock(n);
				if (fetchedBlock) return { type: 'block', block: fetchedBlock };
			} catch (error) {
				console.error('Failed to fetch block:', error);
			}
		}
		
		// Fallback to demo data
		return { type: 'block', block: generateDemoBlock(n) };
	}
	
	if (/^0x[0-9a-fA-F]{64}$/.test(q)) {
		// Check if we have this transaction in cache
		for (const b of AppState.blocks) {
			const tx = b.txs.find(t => t.hash.toLowerCase() === q.toLowerCase());
			if (tx) return { type: 'tx', tx };
		}
		
		// Fetch from RPC if connected
		if (AppState.mode === 'rpc') {
			try {
				const fetchedTx = await fetchTransaction(q);
				if (fetchedTx) return { type: 'tx', tx: fetchedTx };
			} catch (error) {
				console.error('Failed to fetch transaction:', error);
			}
		}
		
		// Fallback to demo data
		return { type: 'tx', tx: { hash: q, from: randomHex(20), to: randomHex(20), value: (Math.random()*2).toFixed(3), status: 'success' } };
	}
	
	if (/^0x[0-9a-fA-F]{40}$/.test(q)) {
		return { type: 'address', address: q };
	}
	
	return { type: 'unknown', q };
}

async function onSearch() {
	const q = els.searchInput.value;
	if (!q.trim()) {
		els.results.innerHTML = '<div class="card">Enter a block number, transaction hash, or address to search.</div>';
		return;
	}
	
	// Show loading state
	els.results.innerHTML = '<div class="card"><div class="loading">🔍 Searching...</div></div>';
	
	try {
		const entity = await parseQuery(q);
		if (!entity || entity.type === 'unknown') {
			els.results.innerHTML = '<div class="card">❌ Invalid search. Enter a block number, transaction hash (0x...), or address (0x...).</div>';
			return;
		}
		renderResults(entity);
	} catch (error) {
		console.error('Search error:', error);
		els.results.innerHTML = '<div class="card">❌ Search failed. Please try again.</div>';
	}
}

function bindUI() {
	els.searchBtn.addEventListener('click', onSearch);
	els.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSearch(); });
	
	// Wallet connection events
	els.connectWallet.addEventListener('click', connectWallet);
	els.disconnectWallet.addEventListener('click', disconnectWallet);
	
	// Listen for wallet account changes
	if (window.ethereum) {
		window.ethereum.on('accountsChanged', (accounts) => {
			if (accounts.length === 0) {
				disconnectWallet();
			} else if (AppState.wallet.connected && AppState.wallet.chain === 'ethereum') {
				AppState.wallet.address = accounts[0];
				updateWalletUI();
				showNotification('🔄 Wallet account changed', 'info');
			}
		});
		
		window.ethereum.on('chainChanged', () => {
			// Refresh the page when chain changes
			window.location.reload();
		});
	}
	
	// Listen for Solana wallet events
	if (window.solana && window.solana.isPhantom) {
		window.solana.on('accountChanged', (publicKey) => {
			if (AppState.wallet.connected && AppState.wallet.type === 'phantom') {
				if (publicKey) {
					AppState.wallet.address = publicKey.toString();
					updateWalletUI();
					showNotification('🔄 Phantom account changed', 'info');
				} else {
					disconnectWallet();
				}
			}
		});
	}
	
	// Listen for Backpack wallet events
	if (window.backpack) {
		window.backpack.on('accountChanged', (publicKey) => {
			if (AppState.wallet.connected && AppState.wallet.type === 'backpack') {
				if (publicKey) {
					AppState.wallet.address = publicKey.toString();
					updateWalletUI();
					showNotification('🔄 Backpack account changed', 'info');
				} else {
					disconnectWallet();
				}
			}
		});
	}
}

// Wallet connection functions
async function connectMetaMask() {
	if (typeof window.ethereum === 'undefined') {
		throw new Error('MetaMask not installed');
	}
	
	const provider = window.ethereum;
	const accounts = await provider.request({ method: 'eth_requestAccounts' });
	
	if (accounts.length === 0) {
		throw new Error('No accounts found');
	}
	
	return {
		provider,
		address: accounts[0],
		type: 'metamask',
		chain: 'ethereum'
	};
}

async function connectWalletConnect() {
	// For demo purposes, simulate WalletConnect
	// In production, you'd integrate with WalletConnect SDK
	throw new Error('WalletConnect integration requires SDK setup');
}

async function connectCoinbase() {
	if (typeof window.coinbaseWalletExtension === 'undefined') {
		throw new Error('Coinbase Wallet not installed');
	}
	
	const provider = window.coinbaseWalletExtension;
	const accounts = await provider.request({ method: 'eth_requestAccounts' });
	
	if (accounts.length === 0) {
		throw new Error('No accounts found');
	}
	
	return {
		provider,
		address: accounts[0],
		type: 'coinbase',
		chain: 'ethereum'
	};
}

async function connectPhantom() {
	if (typeof window.solana === 'undefined' || !window.solana.isPhantom) {
		throw new Error('Phantom wallet not installed');
	}
	
	const provider = window.solana;
	
	// Request connection
	const response = await provider.connect();
	
	if (!response.publicKey) {
		throw new Error('Failed to connect to Phantom wallet');
	}
	
	return {
		provider,
		address: response.publicKey.toString(),
		type: 'phantom',
		chain: 'solana'
	};
}

async function connectBackpack() {
	if (typeof window.backpack === 'undefined') {
		throw new Error('Backpack wallet not installed');
	}
	
	const provider = window.backpack;
	
	// Request connection
	const response = await provider.connect();
	
	if (!response.publicKey) {
		throw new Error('Failed to connect to Backpack wallet');
	}
	
	return {
		provider,
		address: response.publicKey.toString(),
		type: 'backpack',
		chain: 'solana'
	};
}

async function connectWallet() {
	try {
		els.connectWallet.textContent = 'Connecting...';
		els.connectWallet.disabled = true;
		
		let walletData;
		
		// Check for available wallets
		const availableWallets = detectAvailableWallets();
		
		if (availableWallets.length === 0) {
			throw new Error('No wallet extensions detected. Please install MetaMask, Phantom, Backpack, or Coinbase Wallet.');
		}
		
		if (availableWallets.length === 1) {
			// Auto-connect if only one wallet is available
			const walletType = availableWallets[0];
			walletData = await connectWalletByType(walletType);
		} else {
			// Show wallet selection modal
			const walletType = await showWalletSelection(availableWallets);
			if (!walletType) {
				throw new Error('No wallet selected');
			}
			walletData = await connectWalletByType(walletType);
		}
		
		AppState.wallet = {
			connected: true,
			address: walletData.address,
			provider: walletData.provider,
			type: walletData.type,
			chain: walletData.chain
		};
		
		updateWalletUI();
		
		// Show success notification
		showNotification(`✅ Successfully connected to ${walletData.type} wallet!`, 'success');
		
	} catch (error) {
		console.error('Wallet connection failed:', error);
		showNotification(`❌ Failed to connect wallet: ${error.message}`, 'error');
	} finally {
		els.connectWallet.textContent = 'Connect Wallet';
		els.connectWallet.disabled = false;
	}
}

function detectAvailableWallets() {
	const wallets = [];
	
	// Check Ethereum wallets
	if (typeof window.ethereum !== 'undefined') {
		wallets.push('metamask');
	}
	
	if (typeof window.coinbaseWalletExtension !== 'undefined') {
		wallets.push('coinbase');
	}
	
	// Check Solana wallets
	if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
		wallets.push('phantom');
	}
	
	if (typeof window.backpack !== 'undefined') {
		wallets.push('backpack');
	}
	
	return wallets;
}

async function connectWalletByType(walletType) {
	switch (walletType) {
		case 'metamask':
			return await connectMetaMask();
		case 'coinbase':
			return await connectCoinbase();
		case 'phantom':
			return await connectPhantom();
		case 'backpack':
			return await connectBackpack();
		default:
			throw new Error(`Unknown wallet type: ${walletType}`);
	}
}

function showWalletSelection(availableWallets) {
	return new Promise((resolve) => {
		const modal = document.createElement('div');
		modal.style.cssText = `
			position: fixed; top: 0; left: 0; width: 100%; height: 100%;
			background: rgba(0,0,0,0.8); display: flex; align-items: center;
			justify-content: center; z-index: 1000;
		`;
		
		const walletConfigs = {
			metamask: { name: 'MetaMask', emoji: '🦊', chain: 'Ethereum' },
			coinbase: { name: 'Coinbase Wallet', emoji: '🔵', chain: 'Ethereum' },
			phantom: { name: 'Phantom', emoji: '👻', chain: 'Solana' },
			backpack: { name: 'Backpack', emoji: '🎒', chain: 'Solana' }
		};
		
		const walletButtons = availableWallets.map(walletType => {
			const config = walletConfigs[walletType];
			return `
				<button onclick="this.parentElement.parentElement.remove(); resolve('${walletType}')" 
					style="background: linear-gradient(135deg, #8b45ff, #6b35ff); border: none; color: white;
					padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 8px; width: 100%;
					display: flex; align-items: center; justify-content: center; gap: 8px;">
					<span style="font-size: 20px;">${config.emoji}</span>
					<div style="text-align: left;">
						<div style="font-weight: 600;">${config.name}</div>
						<div style="font-size: 12px; opacity: 0.8;">${config.chain}</div>
					</div>
				</button>
			`;
		}).join('');
		
		modal.innerHTML = `
			<div style="background: linear-gradient(180deg, rgba(26, 11, 46, 0.95), rgba(22, 33, 62, 0.95));
				border: 1px solid rgba(139, 69, 255, 0.3); border-radius: 12px; padding: 24px;
				text-align: center; max-width: 400px; width: 90%;">
				<h3 style="margin: 0 0 16px; color: white;">Select Wallet</h3>
				<p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 14px;">
					Choose your preferred wallet to connect:
				</p>
				${walletButtons}
				<button onclick="this.parentElement.parentElement.remove(); resolve(null)" 
					style="background: transparent; border: 1px solid rgba(139, 69, 255, 0.4); color: white;
					padding: 12px 24px; border-radius: 8px; cursor: pointer; margin: 8px; width: 100%;">
					Cancel
				</button>
			</div>
		`;
		
		document.body.appendChild(modal);
	});
}

function showNotification(message, type = 'info') {
	// Remove existing notifications
	const existingNotifications = document.querySelectorAll('.notification');
	existingNotifications.forEach(notification => notification.remove());
	
	const notification = document.createElement('div');
	notification.className = `notification ${type}`;
	notification.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: ${type === 'success' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 
					type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 
					'linear-gradient(135deg, #3b82f6, #2563eb)'};
		color: white;
		padding: 12px 20px;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		z-index: 1001;
		font-weight: 500;
		max-width: 350px;
		animation: slideIn 0.3s ease-out;
		white-space: pre-line;
		line-height: 1.4;
	`;
	
	notification.textContent = message;
	document.body.appendChild(notification);
	
	// Auto-remove after 4 seconds
	setTimeout(() => {
		if (notification.parentElement) {
			notification.style.animation = 'slideOut 0.3s ease-in';
			setTimeout(() => notification.remove(), 300);
		}
	}, 4000);
}

function updateWalletUI() {
	if (AppState.wallet.connected) {
		els.connectWallet.style.display = 'none';
		els.walletInfo.style.display = 'flex';
		
		// Show wallet type and chain
		const walletType = AppState.wallet.type.charAt(0).toUpperCase() + AppState.wallet.type.slice(1);
		const chainType = AppState.wallet.chain.charAt(0).toUpperCase() + AppState.wallet.chain.slice(1);
		const shortAddress = `${AppState.wallet.address.slice(0, 6)}...${AppState.wallet.address.slice(-4)}`;
		
		els.walletAddress.innerHTML = `
			<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
				<div style="font-size: 12px; font-weight: 600;">${walletType} (${chainType})</div>
				<div style="font-size: 11px; opacity: 0.8;">${shortAddress}</div>
			</div>
		`;
	} else {
		els.connectWallet.style.display = 'block';
		els.walletInfo.style.display = 'none';
	}
}

function disconnectWallet() {
	const walletType = AppState.wallet.type;
	AppState.wallet = {
		connected: false,
		address: null,
		provider: null,
		type: null,
		chain: null
	};
	updateWalletUI();
	showNotification(`👋 Disconnected from ${walletType} wallet`, 'info');
}

function init() {
	bindUI();
	startDemoStream();
	renderBadges();
	updateScore();
	updateWalletUI();
}

init();


