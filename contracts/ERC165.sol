pragma solidity 0.5.8;

/**
 * @title ERC165 Base
 *
 * @dev See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-165.md
 *
 * @author Basil Gorin
 */
contract ERC165 {
  /**
   * 0x01ffc9a7 == bytes4(keccak256('supportsInterface(bytes4)'))
   */
  bytes4 public constant InterfaceId_ERC165 = 0x01ffc9a7;

  /**
   * @dev a mapping of interface id to whether or not it's supported
   */
  mapping(bytes4 => bool) internal supportedInterfaces;

  /**
   * @dev A contract implementing SupportsInterfaceWithLookup
   *      implement ERC165 itself
   */
  constructor() public {
    // register itself in a lookup table
    _registerInterface(InterfaceId_ERC165);
  }



  /**
   * @notice Query if a contract implements an interface
   * @dev Interface identification is specified in ERC-165.
   *      This function uses less than 30,000 gas.
   * @param _interfaceId The interface identifier, as specified in ERC-165
   * @return `true` if the contract implements `interfaceID` and
   *      `interfaceID` is not 0xffffffff, `false` otherwise
   */
  function supportsInterface(bytes4 _interfaceId) public view returns (bool) {
    // find if interface is supported using a lookup table
    return supportedInterfaces[_interfaceId];
  }

  /**
   * @dev private method for registering an interface
   */
  function _registerInterface(bytes4 _interfaceId) internal {
    // verify interface id is valid
    require(_interfaceId != 0xffffffff);

    // register the interface
    supportedInterfaces[_interfaceId] = true;
  }
}
