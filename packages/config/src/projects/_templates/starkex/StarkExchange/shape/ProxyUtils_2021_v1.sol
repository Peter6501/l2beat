// SPDX-License-Identifier: Unknown
pragma solidity 0.6.11;

contract ProxyStorage is GovernanceStorage {
    // NOLINTNEXTLINE: naming-convention uninitialized-state.
    mapping(address => bytes32) internal initializationHash_DEPRECATED;

    // The time after which we can switch to the implementation.
    // Hash(implementation, data, finalize) => time.
    mapping(bytes32 => uint256) internal enabledTime;

    // A central storage of the flags whether implementation has been initialized.
    // Note - it can be used flexibly enough to accommodate multiple levels of initialization
    // (i.e. using different key salting schemes for different initialization levels).
    mapping(bytes32 => bool) internal initialized;
}

contract GovernanceStorage {
    struct GovernanceInfoStruct {
        mapping(address => bool) effectiveGovernors;
        address candidateGovernor;
        bool initialized;
    }

    // A map from a Governor tag to its own GovernanceInfoStruct.
    mapping(string => GovernanceInfoStruct) internal governanceInfo;
}

abstract contract MGovernance {
    function isGovernor(address testGovernor) internal view virtual returns (bool);

    /*
      Allows calling the function only by a Governor.
    */
    modifier onlyGovernance() {
        require(isGovernor(msg.sender), "ONLY_GOVERNANCE");
        _;
    }
}

abstract contract Governance is GovernanceStorage, MGovernance {
    event LogNominatedGovernor(address nominatedGovernor);
    event LogNewGovernorAccepted(address acceptedGovernor);
    event LogRemovedGovernor(address removedGovernor);
    event LogNominationCancelled();

    /*
      Returns a string which uniquely identifies the type of the governance mechanism.
    */
    function getGovernanceTag() internal pure virtual returns (string memory);

    /*
      Returns the GovernanceInfoStruct associated with the governance tag.
    */
    function contractGovernanceInfo() internal view returns (GovernanceInfoStruct storage) {
        string memory tag = getGovernanceTag();
        GovernanceInfoStruct storage gub = governanceInfo[tag];
        require(gub.initialized, "NOT_INITIALIZED");
        return gub;
    }

    /*
      Current code intentionally prevents governance re-initialization.
      This may be a problem in an upgrade situation, in a case that the upgrade-to implementation
      performs an initialization (for real) and within that calls initGovernance().

      Possible workarounds:
      1. Clearing the governance info altogether by changing the MAIN_GOVERNANCE_INFO_TAG.
         This will remove existing main governance information.
      2. Modify the require part in this function, so that it will exit quietly
         when trying to re-initialize (uncomment the lines below).
    */
    function initGovernance() internal {
        string memory tag = getGovernanceTag();
        GovernanceInfoStruct storage gub = governanceInfo[tag];
        require(!gub.initialized, "ALREADY_INITIALIZED");
        gub.initialized = true; // to ensure addGovernor() won't fail.
        // Add the initial governer.
        addGovernor(msg.sender);
    }

    function isGovernor(address testGovernor) internal view override returns (bool) {
        GovernanceInfoStruct storage gub = contractGovernanceInfo();
        return gub.effectiveGovernors[testGovernor];
    }

    /*
      Cancels the nomination of a governor candidate.
    */
    function cancelNomination() internal onlyGovernance {
        GovernanceInfoStruct storage gub = contractGovernanceInfo();
        gub.candidateGovernor = address(0x0);
        emit LogNominationCancelled();
    }

    function nominateNewGovernor(address newGovernor) internal onlyGovernance {
        GovernanceInfoStruct storage gub = contractGovernanceInfo();
        require(!isGovernor(newGovernor), "ALREADY_GOVERNOR");
        gub.candidateGovernor = newGovernor;
        emit LogNominatedGovernor(newGovernor);
    }

    /*
      The addGovernor is called in two cases:
      1. by acceptGovernance when a new governor accepts its role.
      2. by initGovernance to add the initial governor.
      The difference is that the init path skips the nominate step
      that would fail because of the onlyGovernance modifier.
    */
    function addGovernor(address newGovernor) private {
        require(!isGovernor(newGovernor), "ALREADY_GOVERNOR");
        GovernanceInfoStruct storage gub = contractGovernanceInfo();
        gub.effectiveGovernors[newGovernor] = true;
    }

    function acceptGovernance() internal {
        // The new governor was proposed as a candidate by the current governor.
        GovernanceInfoStruct storage gub = contractGovernanceInfo();
        require(msg.sender == gub.candidateGovernor, "ONLY_CANDIDATE_GOVERNOR");

        // Update state.
        addGovernor(gub.candidateGovernor);
        gub.candidateGovernor = address(0x0);

        // Send a notification about the change of governor.
        emit LogNewGovernorAccepted(msg.sender);
    }

    /*
      Remove a governor from office.
    */
    function removeGovernor(address governorForRemoval) internal onlyGovernance {
        require(msg.sender != governorForRemoval, "GOVERNOR_SELF_REMOVE");
        GovernanceInfoStruct storage gub = contractGovernanceInfo();
        require(isGovernor(governorForRemoval), "NOT_GOVERNOR");
        gub.effectiveGovernors[governorForRemoval] = false;
        emit LogRemovedGovernor(governorForRemoval);
    }
}

contract ProxyGovernance is Governance {
    // The tag is the string key that is used in the Governance storage mapping.
    string public constant PROXY_GOVERNANCE_TAG = "StarkEx.Proxy.2019.GovernorsInformation";

    function getGovernanceTag() internal pure override returns (string memory tag) {
        tag = PROXY_GOVERNANCE_TAG;
    }

    function proxyIsGovernor(address testGovernor) external view returns (bool) {
        return isGovernor(testGovernor);
    }

    function proxyNominateNewGovernor(address newGovernor) external {
        nominateNewGovernor(newGovernor);
    }

    function proxyRemoveGovernor(address governorForRemoval) external {
        removeGovernor(governorForRemoval);
    }

    function proxyAcceptGovernance() external {
        acceptGovernance();
    }

    function proxyCancelNomination() external {
        cancelNomination();
    }
}

contract StorageSlots {
    // Storage slot with the address of the current implementation.
    // The address of the slot is keccak256("StarkWare2019.implemntation-slot").
    // We need to keep this variable stored outside of the commonly used space,
    // so that it's not overrun by the logical implementation (the proxied contract).
    bytes32 internal constant IMPLEMENTATION_SLOT =
        0x177667240aeeea7e35eabe3a35e18306f336219e1386f7710a6bf8783f761b24;

    // Storage slot with the address of the call-proxy current implementation.
    // The address of the slot is keccak256("'StarkWare2020.CallProxy.Implemntation.Slot'").
    // We need to keep this variable stored outside of the commonly used space.
    // so that it's not overrun by the logical implementation (the proxied contract).
    bytes32 internal constant CALL_PROXY_IMPL_SLOT =
        0x7184681641399eb4ad2fdb92114857ee6ff239f94ad635a1779978947b8843be;

    // This storage slot stores the finalization flag.
    // Once the value stored in this slot is set to non-zero
    // the proxy blocks implementation upgrades.
    // The current implementation is then referred to as Finalized.
    // Web3.solidityKeccak(['string'], ["StarkWare2019.finalization-flag-slot"]).
    bytes32 internal constant FINALIZED_STATE_SLOT =
        0x7d433c6f837e8f93009937c466c82efbb5ba621fae36886d0cac433c5d0aa7d2;

    // Storage slot to hold the upgrade delay (time-lock).
    // The intention of this slot is to allow modification using an EIC.
    // Web3.solidityKeccak(['string'], ['StarkWare.Upgradibility.Delay.Slot']).
    bytes32 public constant UPGRADE_DELAY_SLOT =
        0xc21dbb3089fcb2c4f4c6a67854ab4db2b0f233ea4b21b21f912d52d18fc5db1f;
}

interface Identity {
    /*
      Allows a caller, typically another contract,
      to ensure that the provided address is of the expected type and version.
    */
    function identify() external pure returns (string memory);
}

interface SubContractor is Identity {
    function initialize(bytes calldata data) external;

    function initializerSize() external view returns (uint256);
}

contract ProxyUtils is SubContractor, StorageSlots, ProxyGovernance, ProxyStorage {
    event ImplementationActivationRescheduled(
        address indexed implementation,
        uint256 updatedActivationTime
    );

    function initialize(
        bytes calldata /* data */
    ) external override {
        revert("NOT_IMPLEMENTED");
    }

    function initializerSize() external view override returns (uint256) {
        return 0;
    }

    function identify() external pure override returns (string memory) {
        return "StarkWare_ProxyUtils_2021_1";
    }

    function storedActivationDelay() internal view returns (uint256 delay) {
        bytes32 slot = UPGRADE_DELAY_SLOT;
        assembly {
            delay := sload(slot)
        }
        return delay;
    }

    function updateImplementationActivationTime(
        address implementation,
        bytes calldata data,
        bool finalize
    ) external onlyGovernance {
        uint256 updatedActivationTime = block.timestamp + storedActivationDelay();

        // We assume the Proxy is of the old format.
        bytes32 oldFormatInitHash = keccak256(abi.encode(data, finalize));
        require(
            initializationHash_DEPRECATED[implementation] == oldFormatInitHash,
            "IMPLEMENTATION_NOT_PENDING"
        );

        // Converting address to bytes32 to match the mapping key type.
        bytes32 implementationKey;
        assembly {
            implementationKey := implementation
        }
        uint256 pendingActivationTime = enabledTime[implementationKey];

        require(pendingActivationTime > 0, "IMPLEMENTATION_NOT_PENDING");

        // Current value is checked to be within a reasonable delay. If it's over 6 months from now,
        // it's assumed that the activation time is configured under a different set of rules.
        require(
            pendingActivationTime < block.timestamp + 180 days,
            "INVALID_PENDING_ACTIVATION_TIME"
        );

        if (updatedActivationTime < pendingActivationTime) {
            enabledTime[implementationKey] = updatedActivationTime;
            emit ImplementationActivationRescheduled(implementation, updatedActivationTime);
        }
    }
}