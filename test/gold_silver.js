// Enables ERC20 transfers of the tokens
const FEATURE_TRANSFERS = 0x00000001;

// Enables ERC20 transfers on behalf
const FEATURE_TRANSFERS_ON_BEHALF = 0x00000002;

// Token creator is responsible for creating tokens
const ROLE_TOKEN_CREATOR = 0x00000001;

// Token destroyer is responsible for destroying tokens
const ROLE_TOKEN_DESTROYER = 0x00000002;

// token version length
const TOKEN_VERSION_LENGTH = 0x10000;

// GoldERC20 smart contract
const Token = artifacts.require("./GoldERC20.sol");
// Silver smart contract
const Token1 = artifacts.require("./SilverERC20.sol");

contract('GoldERC20', (accounts) => {
	it("config: gold and silver tokens are distinguishable", async() => {
		const tk = await Token.new();
		const tk1 = await Token1.new();

		const version = await tk.TOKEN_VERSION();
		const version1 = await tk1.TOKEN_VERSION();

		console.log(version1.toString(10));

		// high token version bits represent Silver (1) / Gold (0) flag
		const high = version.dividedToIntegerBy(TOKEN_VERSION_LENGTH);
		const high1 = version1.dividedToIntegerBy(TOKEN_VERSION_LENGTH);

		console.log(high1.toString(10));

		// low token version bits represent token version itself
		const low = version.modulo(TOKEN_VERSION_LENGTH);
		const low1 = version1.modulo(TOKEN_VERSION_LENGTH);

		// verify correct Silver/Gold flags
		assert.equal(0, high, "incorrect high token version bits for Gold token");
		assert.equal(1, high1, "incorrect high token version bits for Silver token");
	});

	it("initial state: balances and allowances are zero", async() => {
		const tk = await Token.new();
		const account0 = accounts[0];
		assert.equal(0, await tk.totalSupply(), "non-zero initial value for totalSupply()");
		assert.equal(0, await tk.balanceOf(account0), "non-zero initial value for balanceOf(account0)");
		assert.equal(0, await tk.allowance(account0, accounts[1]), "non-zero initial value for allowance(account0, account1)");
	});

	it("permissions: creator and destroyer are different permissions", async() => {
		assert(ROLE_TOKEN_CREATOR != ROLE_TOKEN_DESTROYER, "creator and destroyer permissions are equal");
	});
	it("permissions: minting tokens requires ROLE_TOKEN_CREATOR permission", async() => {
		const tk = await Token.new();

		// token creator
		const creator = accounts[1];

		// player
		const player = accounts[2];

		// function to mint tokens
		const fn = async() => await tk.mint(player, 1, {from: creator});

		// originally creator doesn't have required permission
		await assertThrowsAsync(fn);

		// grant creator permission required
		await tk.updateRole(creator, ROLE_TOKEN_CREATOR);

		// verify creator can perform an operation now
		await fn();

		// verify tokens increased correctly
		assert.equal(1, await tk.balanceOf(player), "incorrect token balance after minting a token");
	});
	it("permissions: burning tokens requires ROLE_TOKEN_DESTROYER permission", async() => {
		const tk = await Token.new();

		// token destroyer
		const destroyer = accounts[1];

		// player
		const player = accounts[2];

		// function to burn tokens
		const fn = async() => await tk.burn(player, 1, {from: destroyer});

		// mint a token to be burnt first
		await tk.mint(player, 1);

		// verify initial token balance is correct
		assert.equal(1, await tk.balanceOf(player), "incorrect initial token balance");

		// originally destroyer doesn't have required permission
		await assertThrowsAsync(fn);

		// grant destroyer permission required
		await tk.updateRole(destroyer, ROLE_TOKEN_DESTROYER);

		// verify destroyer can perform an operation now
		await fn();

		// verify tokens decreased correctly
		assert.equal(0, await tk.balanceOf(player), "incorrect token balance after burning a token");
	});
	it("permissions: transfers and transfers on behalf are different features", async() => {
		assert(FEATURE_TRANSFERS != FEATURE_TRANSFERS_ON_BEHALF, "transfers and transfers on behalf features are equal");
	});
	it("permissions: transfers require FEATURE_TRANSFERS feature to be enabled", async() => {
		const tk = await Token.new();

		// players
		const player1 = accounts[1];
		const player2 = accounts[2];

		// mint some tokens
		const amt = rnd();
		await tk.mint(player1, amt);

		// transfer functions
		const fn1 = async() => await tk.transfer(player2, amt, {from: player1});
		const fn2 = async() => await tk.transfer(player1, amt, {from: player2});
		const fn1f = async() => await tk.transferFrom(player1, player2, amt, {from: player1});
		const fn2f = async() => await tk.transferFrom(player2, player1, amt, {from: player2});

		// transfers don't work without feature required
		await assertThrowsAsync(fn1);
		await assertThrowsAsync(fn2);
		await assertThrowsAsync(fn1f);
		await assertThrowsAsync(fn2f);

		// enable feature required
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// perform the transfers
		await fn1();
		await fn2();
		await fn1f();
		await fn2f();

		// verify token balances
		assert.equal(amt, await tk.balanceOf(player1), "wrong player 1 balance after several transfers");
		assert.equal(0, await tk.balanceOf(player2), "non-zero player 2 balance after several transfers");
	});
	it("permissions: transfers on behalf require FEATURE_TRANSFERS_ON_BEHALF feature to be enabled", async() => {
		const tk = await Token.new();

		// players
		const player1 = accounts[1];
		const player2 = accounts[2];

		// exchange (account granted to transfer on behalf)
		const exchange = accounts[3];

		// mint some tokens
		const amt = rnd();
		await tk.mint(player1, amt);

		// grant an exchange permissions to perform transfers on behalf
		await tk.approve(exchange, amt * 10, {from: player1});
		await tk.approve(exchange, amt * 10, {from: player2});

		// transfer on behalf functions
		const fn = async() => await tk.transferFrom(player1, player2, amt, {from: exchange});

		// transfer on behalf doesn't work without feature required
		await assertThrowsAsync(fn);

		// enable feature required
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// perform the transfer on behalf
		await fn();

		// verify token balances
		assert.equal(0, await tk.balanceOf(player1), "non-zero player 1 balance after several transfers");
		assert.equal(amt, await tk.balanceOf(player2), "wrong player 2 balance after several transfers");
	});

	it("minting and burning: general flow", async() => {
		const tk = await Token.new();

		// token creator
		const creator = accounts[1];

		// token destroyer
		const destroyer = accounts[2];

		// player (address to mint tokens to)
		const player = accounts[3];

		// some random amount of tokens
		const amt = rnd();

		// functions to mint ant burn tokens
		const mint = async() => await tk.mint(player, amt, {from: creator});
		const burn = async() => await tk.burn(player, amt, {from: destroyer});

		// initial token balance is zero
		assert.equal(0, await tk.balanceOf(player), "non-zero initial player balance");

		// grant creator and destroyer permission required
		await tk.updateRole(creator, ROLE_TOKEN_CREATOR);
		await tk.updateRole(destroyer, ROLE_TOKEN_DESTROYER);

		// burn cannot be called initially since there is not enough tokens to burn
		await assertThrowsAsync(burn);

		// mint some tokens
		await mint();

		// verify token balance
		assert.equal(amt, await tk.balanceOf(player), "incorrect token balance after minting some tokens");

		// burning is possible now: there is enough tokens to burn
		await burn();

		// verify token balance
		assert.equal(0, await tk.balanceOf(player), "incorrect token balance after burning the tokens");

		// burning cannot be called now again
		await assertThrowsAsync(burn);
	});

	it("transfers: transferring tokens", async() => {
		const tk = await Token.new();

		// enable feature: transfers (required)
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// players
		const player1 = accounts[1];
		const player2 = accounts[2];

		// mint some tokens
		const amt = rnd();
		await tk.mint(player1, amt);

		// transfer functions: player1 -> player2 and player2 -> player1
		const fn1 = async() => await tk.transfer(player2, amt, {from: player1});
		const fn2 = async() => await tk.transfer(player1, amt, {from: player2});

		// perform the transfers, incorrect and correct, check balances after each transfer:
		// player 1 -> player 2
		await assertThrowsAsync(fn2);
		await fn1();
		assert.equal(0, await tk.balanceOf(player1), "non-zero player 1 balance");
		assert.equal(amt, await tk.balanceOf(player2), "wrong player 2 balance");

		// player 2 -> player 1
		await assertThrowsAsync(fn1);
		await fn2();
		assert.equal(0, await tk.balanceOf(player2), "non-zero player 2 balance");
		assert.equal(amt, await tk.balanceOf(player1), "wrong player 1 balance");

		// player 1 -> player 2 again
		await assertThrowsAsync(fn2);
		await fn1();
		assert.equal(0, await tk.balanceOf(player1), "non-zero player 1 balance (1)");
		assert.equal(amt, await tk.balanceOf(player2), "wrong player 2 balance (1)");
	});
	it("transfers: transferring on behalf", async() => {
		const tk = await Token.new();

		// enable feature: transfers on behalf (required)
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// players
		const player1 = accounts[1];
		const player2 = accounts[2];

		// exchange (account granted to transfer on behalf)
		const exchange = accounts[3];

		// mint some tokens
		const amt = rnd();
		await tk.mint(player1, amt);

		// transfer functions: player1 -> player2 and player2 -> player1
		const t1 = async() => await tk.transferFrom(player1, player2, amt, {from: exchange});
		const t2 = async() => await tk.transferFrom(player2, player1, amt, {from: exchange});

		// transfer approve on behalf functions:
		const ap1 = async() => await tk.approve(exchange, amt, {from: player1});
		const ap2 = async() => await tk.approve(exchange, amt, {from: player2});

		// perform the transfers, incorrect and correct, check balances after each transfer:
		// player 1 -> player 2
		await assertThrowsAsync(t1); // not approved
		await assertThrowsAsync(t2); // zero balance
		await ap1(); // approve
		await t1();  // transfer
		assert.equal(0, await tk.balanceOf(player1), "non-zero player 1 balance");
		assert.equal(amt, await tk.balanceOf(player2), "wrong player 2 balance");

		// player 2 -> player 1
		await assertThrowsAsync(t1); // zero balance
		await assertThrowsAsync(t2); // not approved
		await ap2(); // approve
		await t2();  // transfer
		assert.equal(0, await tk.balanceOf(player2), "non-zero player 2 balance");
		assert.equal(amt, await tk.balanceOf(player1), "wrong player 1 balance");
	});

	it("transfers: transfer arithmetic check", async() => {
		const tk = await Token.new();

		// enable feature: transfers (required)
		await tk.updateFeatures(FEATURE_TRANSFERS);

		// players
		const player1 = accounts[1];
		const player2 = accounts[2];

		// mint maximum tokens to player 1
		const amt = rnd();
		await tk.mint(player1, rnd_max);

		// verify initial amounts
		assert.equal(rnd_max, await tk.balanceOf(player1), "wrong player 1 initial balance");
		assert.equal(0, await tk.balanceOf(player2), "non-zero player 2 initial balance");

		// a function to perform the transfer
		const fn = async(amt) => await tk.transfer(player2, amt, {from: player1});

		// transfer some random number of tokens
		await fn(amt);

		// verify the math works correctly
		assert.equal(rnd_max - amt, await tk.balanceOf(player1), "wrong player 1 balance after transferring some tokens");
		assert.equal(amt, await tk.balanceOf(player2), "wrong player 2 balance after transferring some tokens");

		// transfer all the rest of the tokens
		await assertThrowsAsync(fn, rnd_max - amt + 1); // too much
		await fn(rnd_max - amt);

		// verify the math works correctly
		assert.equal(0, await tk.balanceOf(player1), "non-zero player 1 balance after transferring all the tokens");
		assert.equal(rnd_max, await tk.balanceOf(player2), "wrong player 2 balance after transferring all the tokens");
	});
	it("transfers: transfer on behalf arithmetic check", async() => {
		const tk = await Token.new();

		// enable feature: transfers on behalf (required)
		await tk.updateFeatures(FEATURE_TRANSFERS_ON_BEHALF);

		// players
		const player1 = accounts[1];
		const player2 = accounts[2];

		// exchange (account granted to transfer on behalf)
		const exchange = accounts[3];

		// mint maximum tokens to player 1
		const amt = rnd();
		await tk.mint(player1, rnd_max);

		// approve all the gems
		await tk.approve(exchange, rnd_max + 2, {from: player1});

		// verify full allowance
		assert.equal(rnd_max + 2, await tk.allowance(player1, exchange), "wrong allowance for exchange by player 1");

		// verify initial amounts
		assert.equal(rnd_max, await tk.balanceOf(player1), "wrong player 1 initial balance");
		assert.equal(0, await tk.balanceOf(player2), "non-zero player 2 initial balance");

		// a function to perform the transfer
		const fn = async(amt) => await tk.transferFrom(player1, player2, amt, {from: exchange});

		// transfer some random number of tokens
		await fn(amt);

		// verify partial allowance
		assert.equal(rnd_max - amt + 2, await tk.allowance(player1, exchange), "wrong allowance for exchange by player 1 after partial transfer");

		// verify the math works correctly
		assert.equal(rnd_max - amt, await tk.balanceOf(player1), "wrong player 1 balance after transferring some tokens");
		assert.equal(amt, await tk.balanceOf(player2), "wrong player 2 balance after transferring some tokens");

		// transfer all the rest of the tokens
		await assertThrowsAsync(fn, rnd_max - amt + 1); // too much
		await fn(rnd_max - amt);

		// verify the math works correctly
		assert.equal(0, await tk.balanceOf(player1), "non-zero player 1 balance after transferring all the tokens");
		assert.equal(rnd_max, await tk.balanceOf(player2), "wrong player 2 balance after transferring all the tokens");

		// verify final allowance
		assert.equal(2, await tk.allowance(player1, exchange), "wrong allowance for exchange by player 1 after full transfer");
	});

});

// maximum random value (exclusive)
const rnd_max = 4294967296;

// default random function to use
function rnd() {
	return Math.round(Math.random() * rnd_max);
}

// auxiliary function to ensure function `fn` throws
async function assertThrowsAsync(fn, ...args) {
	let f = () => {};
	try {
		await fn(...args);
	}
	catch(e) {
		f = () => {
			throw e;
		};
	}
	finally {
		assert.throws(f);
	}
}