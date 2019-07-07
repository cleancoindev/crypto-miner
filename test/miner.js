// Miner smart contract dependencies
const Gem = artifacts.require("./GemERC721.sol");
const Plot = artifacts.require("./PlotERC721.sol");
const Artifact = artifacts.require("./PlotERC721.sol"); // TODO
const Silver = artifacts.require("./SilverERC20.sol");
const Gold = artifacts.require("./GoldERC20.sol");
const ArtifactERC20 = artifacts.require("./ArtifactERC20.sol");
const FoundersKey = artifacts.require("./FoundersKeyERC20.sol");
const ChestKey = artifacts.require("./ChestKeyERC20.sol");

// Miner smart contract itself
const Miner = artifacts.require("./Miner.sol");

// import ERC721Core dependencies
import {ROLE_EXT_WRITER, ROLE_STATE_PROVIDER} from "./erc721_core";
// import PlotERC721 dependencies
import {ROLE_OFFSET_PROVIDER} from "./erc721_core";
// import GemERC721 dependencies
import {ROLE_AGE_PROVIDER} from "./erc721_core";

// define Miner specific Features and Roles
const FEATURE_MINING_ENABLED = 0x00000001;
const ROLE_MINING_OPERATOR = 0x00000001;
const ROLE_ROLLBACK_OPERATOR = 0x00000002;
const ROLE_GEM_COLORS_PROVIDER = 0x00000004;
const ROLE_SPECIAL_GEMS_PROVIDER = 0x00000008;

// Miner smart contract tests
contract('Miner', (accounts) => {
	it("deployment: verify deployment routine", async() => {
		// define miner dependencies
		const g = await Gem.new();
		const p = await Plot.new();
		const a = await Artifact.new();
		const s = await Silver.new();
		const o = await Gold.new();
		const e = await ArtifactERC20.new();
		const f = await FoundersKey.new();
		const c = await ChestKey.new();

		// verify wrong constructor parameters fail
		await assertThrows(Miner.new, 0, p.address, a.address, s.address, o.address, e.address, f.address, c.address);
		await assertThrows(Miner.new, g.address, 0, a.address, s.address, o.address, e.address, f.address, c.address);
		await assertThrows(Miner.new, g.address, p.address, 0, s.address, o.address, e.address, f.address, c.address);
		await assertThrows(Miner.new, g.address, p.address, a.address, 0, o.address, e.address, f.address, c.address);
		await assertThrows(Miner.new, g.address, p.address, a.address, s.address, 0, e.address, f.address, c.address);
		await assertThrows(Miner.new, g.address, p.address, a.address, s.address, o.address, 0, f.address, c.address);
		await assertThrows(Miner.new, g.address, p.address, a.address, s.address, o.address, e.address, 0, c.address);
		await assertThrows(Miner.new, g.address, p.address, a.address, s.address, o.address, e.address, f.address, 0);

		// deploy miner smart contract itself
		const miner = await Miner.new(g.address, p.address, a.address, s.address, o.address, e.address, f.address, c.address);

		// verify the setup
		assert.equal(g.address, await miner.gemInstance(), "wrong gem instance address");
		assert.equal(p.address, await miner.plotInstance(), "wrong plot instance address");
		//assert.equal(artifact.address, await miner.artifactInstance(), "wrong artifact instance address");
		assert.equal(s.address, await miner.silverInstance(), "wrong silver instance address");
		assert.equal(o.address, await miner.goldInstance(), "wrong gold instance address");
		assert.equal(e.address, await miner.artifactErc20Instance(), "wrong artifact ERC20 instance address");
		assert.equal(f.address, await miner.foundersKeyInstance(), "wrong founder's key instance address");
		assert.equal(c.address, await miner.chestKeyInstance(), "wrong chest key instance address");
		assertArraysEqual([1, 2, 5, 6, 7, 9, 10], await miner.getGemColors(), "incorrect initial value for gem colors array");
	});

	it("colors: setGemColors requires ROLE_GEM_COLORS_PROVIDER permission", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await miner.setGemColors([1, 2, 3], {from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await miner.updateRole(operator, ROLE_GEM_COLORS_PROVIDER);
		// fn succeeds
		await fn();

		// available colors array updated
		assertArraysEqual([1, 2, 3], await miner.getGemColors(), "incorrect value for gem colors array");
	});
	it("colors: verify integrity of set/get available colors operation", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// ensure empty colors array cannot be set
		await assertThrows(miner.setGemColors, []);

		// set and get several colors randomly
		for(let i = 0; i < 10; i++) {
			const length = Math.ceil(Math.random() * 12);
			const colors = new Array(length);
			for(let j = 0; j < length; j++) {
				colors[j] = Math.ceil(Math.random() * 12);
			}
			// set the available colors
			await miner.setGemColors(colors);
			// verify available colors are set correctly
			assertArraysEqual(colors, await miner.getGemColors(), "incorrect gem colors array " + i);
		}
	});

	it("mining rates: setting mining rates requires ROLE_SPECIAL_GEMS_PROVIDER permission", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// define an address to act as an operator
		const operator = accounts[1];

		// define the function to check permissions for
		const fn = async() => await miner.setSpecialGem(0xF001, 150, 2, {from: operator});

		// initially fn throws
		await assertThrows(fn);
		// after setting the required permission to operator
		await miner.updateRole(operator, ROLE_SPECIAL_GEMS_PROVIDER);
		// fn still fails since miner itself doesn't have required permission
		await assertThrows(fn);
		// after setting required permission to the miner itself
		await gem.updateRole(miner.address, ROLE_EXT_WRITER);
		// fn succeeds
		await fn();

		// mining rate multiplier successfully updated for special gem
		const tuple = await miner.getSpecialGem(0xF001);
		assert.equal(150, tuple[0], "incorrect mining rate multiplier for 0xF001");
		assert.equal(2, tuple[1], "incorrect special color for 0xF001");
	});
	it("mining rates: verify integrity of set/get mining rate multiplier", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// give miner a permission to write gem's extension
		await gem.updateRole(miner.address, ROLE_EXT_WRITER);

		// ensure properties for non-special gem(s) cannot be set
		await assertThrows(miner.setSpecialGem, 0x1, 1, 0);
		await assertThrows(miner.setSpecialGem, 0x401, 1, 2);
		await assertThrows(miner.setSpecialGem, 0xF000, 1, 2);
		await assertThrows(miner.setSpecialGem, 0x10000, 1, 2);
		await assertThrows(miner.setSpecialGem, 0x11000, 1, 2);
		await assertThrows(miner.setSpecialGem, 0x20000, 1, 2);

		// define special gem ID to operate on
		const specialGemId = 0xF001;

		// set special gem properties
		await miner.setSpecialGem(specialGemId, 100, 0);

		// verify properties set
		const tuple = await miner.getSpecialGem(specialGemId);
		assert.equal(100, tuple[0], "incorrect mining rate multiplier for " + specialGemId);
		assert.equal(0, tuple[1], "incorrect special color for " + specialGemId);

		// miningRateOf fails initially – no gem is actually minted ;)
		await assertThrows(miner.miningRateOf, specialGemId);

		// mint a gem with a properties simple to calculate:
		// color hits the month: +5%
		// grade is AAA zero value: x50 rate
		await gem.mint(accounts[0], specialGemId, new Date().getMonth() + 1, 1, 0x06000000);

		// expected mining rate is 50 * 1.05 * 2.00
		assert.equal(Math.floor(1000000 * 50 * 1.05 * 2.00), await miner.miningRateOf(specialGemId));
	});

	it("mining: mining properties of the new gem(s)", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// create few different gems
		// low grade high level gem (level 5, grade D, value 0.8)
		await gem.mint(accounts[0], 1, 1, 5, 0x10C3500);
		// mid level mid grade gem (level 3, grade A, value 0.4)
		await gem.mint(accounts[0], 2, 1, 3, 0x4061A80);
		// high grade low level gem (level 1, grade AAA+, value 0.99..)
		await gem.mint(accounts[0], 3, 1, 1, 0x60F423F);

		// energetic age of all gems is zero
		assert.equal(0, await miner.energeticAgeOf(1), "non-zero energetic age for gem ID 1");
		assert.equal(0, await miner.energeticAgeOf(2), "non-zero energetic age for gem ID 2");
		assert.equal(0, await miner.energeticAgeOf(3), "non-zero energetic age for gem ID 3");

		// resting energy is also zero
		assert.equal(0, await miner.restingEnergyOf(1), "non-zero resting energy for gem ID 1");
		assert.equal(0, await miner.restingEnergyOf(2), "non-zero resting energy for gem ID 2");
		assert.equal(0, await miner.restingEnergyOf(3), "non-zero resting energy for gem ID 3");

		// verify mining rate
		assert.equal(1200000, await miner.miningRateOf(1), "incorrect mining rate for gem ID 1");
		assert.equal(7920000, await miner.miningRateOf(2), "incorrect mining rate for gem ID 2");
		assert.equal(62999987, await miner.miningRateOf(3), "incorrect mining rate for gem ID 3");

		// verify effective resting energy is zero
		assert.equal(0, await miner.effectiveRestingEnergyOf(1), "non-zero effective resting energy for gem ID 1");
		assert.equal(0, await miner.effectiveRestingEnergyOf(2), "non-zero effective resting energy for gem ID 2");
		assert.equal(0, await miner.effectiveRestingEnergyOf(3), "non-zero effective resting energy for gem ID 3");

		// verify effective mining energy is zero
		assert.equal(0, await miner.effectiveMiningEnergyOf(1), "non-zero effective mining energy for gem ID 1");
		assert.equal(0, await miner.effectiveMiningEnergyOf(2), "non-zero effective mining energy for gem ID 2");
		assert.equal(0, await miner.effectiveMiningEnergyOf(3), "non-zero effective mining energy for gem ID 3");

		// create few different plots
		// plot in Antarctica, plot ID 1
		await plot.mint(accounts[0], 0, "0x0200236464646400");
		// plot in Russia, plot ID 0x10001
		await plot.mint(accounts[0], 1, "0x05002341555F6400");

		// verify how deep can gems mine these plots
		// with the top level gem
		assert.equal(100, await miner.gemMinesTo(1, 1), "wrong mines to calc for (1, 1)");
		assert.equal(100, await miner.gemMinesTo(1, 0x10001), "wrong mine to calc for (1, 0x10001)");

		// with the mid level gem
		assert.equal(100, await miner.gemMinesTo(2, 1), "wrong mines to calc for (2, 1)");
		assert.equal(85, await miner.gemMinesTo(2, 0x10001), "wrong mine to calc for (2, 0x10001)");

		// with the low level gem
		assert.equal(35, await miner.gemMinesTo(3, 1), "wrong mines to calc for (3, 1)");
		assert.equal(35, await miner.gemMinesTo(3, 0x10001), "wrong mine to calc for (3, 0x10001)");
	});

	it("mining: binding gem to a plot", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// create a high grade low level gem
		await gem.mint(accounts[0], 1, 1, 1, 0x60F423F);
		// create a plot in Antarctica
		await plot.mint(accounts[0], 0, "0x0200236464646400");

		// enable mining feature on the miner
		await miner.updateFeatures(FEATURE_MINING_ENABLED);
		// grant miner permissions to modify gem's state
		await gem.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_AGE_PROVIDER);
		// grant miner permission(s) to update plot
		await plot.updateRole(miner.address, ROLE_STATE_PROVIDER | ROLE_OFFSET_PROVIDER);

		// verify initially states are zeros and tokens are transferable
		assert.equal(0, await gem.getState(1), "non-zero gem's state");
		assert(await gem.isTransferable(1), "gem is not transferable");
		assert.equal(0, await plot.getState(1), "non-zero plot's state");
		assert(await plot.isTransferable(1), "plot is not transferable");

		// bind gem to a plot
		await miner.bind(1, 1);

		// verify all the tokens are locked now
		assert.equal(1, await gem.getState(1), "wrong gem's state");
		assert(!await gem.isTransferable(1), "gem is still transferable");
		assert.equal(1, await plot.getState(1), "wrong plot's state");
		assert(!await plot.isTransferable(1), "plot is still transferable");
	});

	it("colors: verify random color getter", async() => {
		// define miner dependencies
		const gem = await Gem.new();
		const plot = await Plot.new();
		const artifact = await Artifact.new();
		const silver = await Silver.new();
		const gold = await Gold.new();
		const artifactErc20 = await ArtifactERC20.new();
		const foundersKey = await FoundersKey.new();
		const chestKey = await ChestKey.new();

		// deploy miner smart contract itself
		const miner = await Miner.new(
			gem.address,
			plot.address,
			artifact.address,
			silver.address,
			gold.address,
			artifactErc20.address,
			foundersKey.address,
			chestKey.address
		);

		// we are using 6 different colors for the test
		await miner.setGemColors([1, 2, 3, 4, 5, 6]);

		// we use following array to capture statistics
		const colors = new Array(6).fill(0);

		// we run 600 rounds and expect each color to be present around 100 times
		for(let i = 0; i < 600; i++) {
			colors[await miner.randomColor(Math.floor(Math.random() * 65536)) - 1]++;
		}

		// ensure we have reasonable amount of each color
		for(let i = 0; i < colors.length; i++) {
			// calculator: https://stattrek.com/online-calculator/binomial.aspx
			// formula: https://stattrek.com/probability-distributions/binomial.aspx
			// probability of not fitting in 25% bounds is 0.3%
			assert(75 < colors[i] && colors[i] < 125, `color ${i + 1} out of bounds: ${colors[i]} entries`);
		}
	});

});


// import auxiliary function to ensure function `fn` throws
import {assertArraysEqual, assertThrows} from "../scripts/shared_functions";
