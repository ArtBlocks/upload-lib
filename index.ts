import "dotenv/config";
import { Wallet, JsonRpcProvider, Contract } from "ethers";
import fs from "fs";
import zlib from "zlib";
import util from "util";
import Graphemer from "graphemer";

const MAX_CONTENT_SIZE = 23500;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const FLEX_CONTRACT_ADDRESS = process.env.FLEX_CONTRACT_ADDRESS;
const FLEX_PROJECT_ID = process.env.FLEX_PROJECT_ID;
const RPC_URL = process.env.RPC_URL;
const ABI = [
  {
    inputs: [
      { internalType: "string", name: "_tokenName", type: "string" },
      { internalType: "string", name: "_tokenSymbol", type: "string" },
      {
        internalType: "address",
        name: "_renderProviderAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_platformProviderAddress",
        type: "address",
      },
      { internalType: "address", name: "_randomizerContract", type: "address" },
      { internalType: "address", name: "_adminACLContract", type: "address" },
      { internalType: "uint248", name: "_startingProjectId", type: "uint248" },
      {
        internalType: "bool",
        name: "_autoApproveArtistSplitProposals",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
    ],
    name: "AcceptedArtistAddressesAndSplits",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      { indexed: false, internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
    ],
    name: "ExternalAssetDependencyRemoved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
      { indexed: false, internalType: "string", name: "_cid", type: "string" },
      {
        indexed: false,
        internalType:
          "enum IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType",
        name: "_dependencyType",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "uint24",
        name: "_externalAssetDependencyCount",
        type: "uint24",
      },
    ],
    name: "ExternalAssetDependencyUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType:
          "enum IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType",
        name: "_dependencyType",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "string",
        name: "_gatewayAddress",
        type: "string",
      },
    ],
    name: "GatewayUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "_to", type: "address" },
      {
        indexed: true,
        internalType: "uint256",
        name: "_tokenId",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_currentMinter",
        type: "address",
      },
    ],
    name: "MinterUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "_field",
        type: "bytes32",
      },
    ],
    name: "PlatformUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
    ],
    name: "ProjectExternalAssetDependenciesLocked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "_update",
        type: "bytes32",
      },
    ],
    name: "ProjectUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "_projectId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_artistAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_additionalPayeePrimarySales",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_additionalPayeePrimarySalesPercentage",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_additionalPayeeSecondarySales",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_additionalPayeeSecondarySalesPercentage",
        type: "uint256",
      },
    ],
    name: "ProposedArtistAddressesAndSplits",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      { internalType: "string", name: "_projectName", type: "string" },
      {
        internalType: "address payable",
        name: "_artistAddress",
        type: "address",
      },
    ],
    name: "addProject",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_cidOrData", type: "string" },
      {
        internalType:
          "enum IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType",
        name: "_dependencyType",
        type: "uint8",
      },
    ],
    name: "addProjectExternalAssetDependency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_script", type: "string" },
    ],
    name: "addProjectScript",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_sender", type: "address" },
      { internalType: "address", name: "_contract", type: "address" },
      { internalType: "bytes4", name: "_selector", type: "bytes4" },
    ],
    name: "adminACLAllowed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "adminACLContract",
    outputs: [
      { internalType: "contract IAdminACLV0", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      {
        internalType: "address payable",
        name: "_artistAddress",
        type: "address",
      },
      {
        internalType: "address payable",
        name: "_additionalPayeePrimarySales",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_additionalPayeePrimarySalesPercentage",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "_additionalPayeeSecondarySales",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_additionalPayeeSecondarySalesPercentage",
        type: "uint256",
      },
    ],
    name: "adminAcceptArtistAddressesAndSplits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "artblocksDependencyRegistryAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "autoApproveArtistSplitProposals",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "coreType",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "coreVersion",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "defaultBaseURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "forbidNewProjects",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getApproved",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_index", type: "uint256" }],
    name: "getHistoricalRandomizerAt",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint256", name: "_price", type: "uint256" },
    ],
    name: "getPrimaryRevenueSplits",
    outputs: [
      {
        internalType: "uint256",
        name: "renderProviderRevenue_",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "renderProviderAddress_",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "platformProviderRevenue_",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "platformProviderAddress_",
        type: "address",
      },
      { internalType: "uint256", name: "artistRevenue_", type: "uint256" },
      {
        internalType: "address payable",
        name: "artistAddress_",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "additionalPayeePrimaryRevenue_",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "additionalPayeePrimaryAddress_",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    name: "getRoyalties",
    outputs: [
      {
        internalType: "address payable[]",
        name: "recipients",
        type: "address[]",
      },
      { internalType: "uint256[]", name: "bps", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_minter", type: "address" }],
    name: "isMintWhitelisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "lockProjectExternalAssetDependencies",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "address", name: "_by", type: "address" },
    ],
    name: "mint_Ecf",
    outputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "minterContract",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "newProjectsForbidden",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextProjectId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "numHistoricalRandomizers",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformProviderPrimarySalesAddress",
    outputs: [{ internalType: "address payable", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformProviderPrimarySalesPercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformProviderSecondarySalesAddress",
    outputs: [{ internalType: "address payable", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformProviderSecondarySalesBPS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "preferredArweaveGateway",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "preferredIPFSGateway",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectArtistPaymentInfo",
    outputs: [
      { internalType: "address", name: "artistAddress", type: "address" },
      {
        internalType: "address",
        name: "additionalPayeePrimarySales",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "additionalPayeePrimarySalesPercentage",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "additionalPayeeSecondarySales",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "additionalPayeeSecondarySalesPercentage",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "secondaryMarketRoyaltyPercentage",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectDetails",
    outputs: [
      { internalType: "string", name: "projectName", type: "string" },
      { internalType: "string", name: "artist", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "website", type: "string" },
      { internalType: "string", name: "license", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint256", name: "_index", type: "uint256" },
    ],
    name: "projectExternalAssetDependencyByIndex",
    outputs: [
      {
        components: [
          { internalType: "string", name: "cid", type: "string" },
          {
            internalType:
              "enum IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType",
            name: "dependencyType",
            type: "uint8",
          },
          { internalType: "address", name: "bytecodeAddress", type: "address" },
          { internalType: "string", name: "data", type: "string" },
        ],
        internalType:
          "struct IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyWithData",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectExternalAssetDependencyCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectIdToAdditionalPayeePrimarySales",
    outputs: [{ internalType: "address payable", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectIdToAdditionalPayeePrimarySalesPercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectIdToAdditionalPayeeSecondarySales",
    outputs: [{ internalType: "address payable", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectIdToAdditionalPayeeSecondarySalesPercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectIdToArtistAddress",
    outputs: [{ internalType: "address payable", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectIdToSecondaryMarketRoyaltyPercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint256", name: "_index", type: "uint256" },
    ],
    name: "projectScriptByIndex",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint256", name: "_index", type: "uint256" },
    ],
    name: "projectScriptBytecodeAddressByIndex",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectScriptDetails",
    outputs: [
      { internalType: "string", name: "scriptTypeAndVersion", type: "string" },
      { internalType: "string", name: "aspectRatio", type: "string" },
      { internalType: "uint256", name: "scriptCount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectStateData",
    outputs: [
      { internalType: "uint256", name: "invocations", type: "uint256" },
      { internalType: "uint256", name: "maxInvocations", type: "uint256" },
      { internalType: "bool", name: "active", type: "bool" },
      { internalType: "bool", name: "paused", type: "bool" },
      { internalType: "uint256", name: "completedTimestamp", type: "uint256" },
      { internalType: "bool", name: "locked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "projectURIInfo",
    outputs: [
      { internalType: "string", name: "projectBaseURI", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      {
        internalType: "address payable",
        name: "_artistAddress",
        type: "address",
      },
      {
        internalType: "address payable",
        name: "_additionalPayeePrimarySales",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_additionalPayeePrimarySalesPercentage",
        type: "uint256",
      },
      {
        internalType: "address payable",
        name: "_additionalPayeeSecondarySales",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_additionalPayeeSecondarySalesPercentage",
        type: "uint256",
      },
    ],
    name: "proposeArtistPaymentAddressesAndSplits",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "proposedArtistAddressesAndSplitsHash",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "randomizerContract",
    outputs: [
      {
        internalType: "contract IRandomizer_V3CoreBase",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint256", name: "_index", type: "uint256" },
    ],
    name: "removeProjectExternalAssetDependency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "removeProjectLastScript",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renderProviderPrimarySalesAddress",
    outputs: [{ internalType: "address payable", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renderProviderPrimarySalesPercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renderProviderSecondarySalesAddress",
    outputs: [{ internalType: "address payable", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renderProviderSecondarySalesBPS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_tokenId", type: "uint256" },
      { internalType: "bytes32", name: "_hashSeed", type: "bytes32" },
    ],
    name: "setTokenHash_8PT",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "startingProjectId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "toggleProjectIsActive",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    name: "toggleProjectIsPaused",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    name: "tokenIdToHash",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    name: "tokenIdToHashSeed",
    outputs: [{ internalType: "bytes12", name: "", type: "bytes12" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    name: "tokenIdToProjectId",
    outputs: [{ internalType: "uint256", name: "_projectId", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_artblocksDependencyRegistryAddress",
        type: "address",
      },
    ],
    name: "updateArtblocksDependencyRegistryAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_gateway", type: "string" }],
    name: "updateArweaveGateway",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_defaultBaseURI", type: "string" },
    ],
    name: "updateDefaultBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_gateway", type: "string" }],
    name: "updateIPFSGateway",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_address", type: "address" }],
    name: "updateMinterContract",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      {
        internalType: "address payable",
        name: "_artistAddress",
        type: "address",
      },
    ],
    name: "updateProjectArtistAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_projectArtistName", type: "string" },
    ],
    name: "updateProjectArtistName",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_aspectRatio", type: "string" },
    ],
    name: "updateProjectAspectRatio",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_newBaseURI", type: "string" },
    ],
    name: "updateProjectBaseURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_projectDescription", type: "string" },
    ],
    name: "updateProjectDescription",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint256", name: "_index", type: "uint256" },
      { internalType: "string", name: "_cidOrData", type: "string" },
      {
        internalType:
          "enum IGenArt721CoreContractV3_Engine_Flex.ExternalAssetDependencyType",
        name: "_dependencyType",
        type: "uint8",
      },
    ],
    name: "updateProjectExternalAssetDependency",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_projectLicense", type: "string" },
    ],
    name: "updateProjectLicense",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint24", name: "_maxInvocations", type: "uint24" },
    ],
    name: "updateProjectMaxInvocations",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_projectName", type: "string" },
    ],
    name: "updateProjectName",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "uint256", name: "_scriptId", type: "uint256" },
      { internalType: "string", name: "_script", type: "string" },
    ],
    name: "updateProjectScript",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      {
        internalType: "bytes32",
        name: "_scriptTypeAndVersion",
        type: "bytes32",
      },
    ],
    name: "updateProjectScriptType",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      {
        internalType: "uint256",
        name: "_secondMarketRoyalty",
        type: "uint256",
      },
    ],
    name: "updateProjectSecondaryMarketRoyaltyPercentage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_projectId", type: "uint256" },
      { internalType: "string", name: "_projectWebsite", type: "string" },
    ],
    name: "updateProjectWebsite",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "renderProviderPrimarySalesPercentage_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "platformProviderPrimarySalesPercentage_",
        type: "uint256",
      },
    ],
    name: "updateProviderPrimarySalesPercentages",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_renderProviderPrimarySalesAddress",
        type: "address",
      },
      {
        internalType: "address payable",
        name: "_renderProviderSecondarySalesAddress",
        type: "address",
      },
      {
        internalType: "address payable",
        name: "_platformProviderPrimarySalesAddress",
        type: "address",
      },
      {
        internalType: "address payable",
        name: "_platformProviderSecondarySalesAddress",
        type: "address",
      },
    ],
    name: "updateProviderSalesAddresses",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_renderProviderSecondarySalesBPS",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_platformProviderSecondarySalesBPS",
        type: "uint256",
      },
    ],
    name: "updateProviderSecondarySalesBPS",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_randomizerAddress", type: "address" },
    ],
    name: "updateRandomizerAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const gzip = util.promisify(zlib.gzip);
const readFile = util.promisify(fs.readFile);

function chunk(s: string, maxBytes: number) {
  let buf = Buffer.from(s);
  const result: string[] = [];

  // Use Graphemer to split on grapheme boundaries
  const splitter = new Graphemer();

  while (buf.length) {
    const splitString = splitter.splitGraphemes(buf.toString("utf-8"));
    let i = maxBytes;

    // Assume that each chunk is composed of single-byte characters
    let chunk = splitString.slice(0, i).join("");
    let chunkSize = Buffer.byteLength(chunk);

    // If the chunk contains multi-byte characters, it will be too large
    // Reduce the chunk size until it fits
    if (chunkSize > maxBytes) {
      while (chunkSize > maxBytes) {
        i--;
        chunk = splitString.slice(0, i).join("");
        chunkSize = Buffer.byteLength(chunk);
      }
    }

    // This is a safe cut-off point; never half-way a multi-byte
    result.push(buf.subarray(0, i).toString());
    buf = buf.subarray(i); // Skip space (if any)
  }
  return result;
}

async function gzipAndBase64Encode(filePath: string) {
  try {
    // Read file
    const fileData = await readFile(filePath);

    // Gzip file
    const gzippedData = await gzip(fileData);

    // Base64 encode
    return gzippedData.toString("base64");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

function validateEnvVars() {
  if (!WALLET_PRIVATE_KEY) {
    throw new Error("WALLET_PRIVATE_KEY is required");
  }
  if (!FLEX_CONTRACT_ADDRESS) {
    throw new Error("FLEX_CONTRACT_ADDRESS is required");
  }
  if (!FLEX_PROJECT_ID) {
    throw new Error("FLEX_PROJECT_ID is required");
  }
  if (!RPC_URL) {
    throw new Error("RPC_URL is required");
  }
}

const main = async () => {
  validateEnvVars();
  const filePath = process.argv[2];
  const content = await gzipAndBase64Encode(filePath);
  if (!content) {
    throw new Error("Failed to gzip and base64 encode file");
  }
  const chunks = chunk(content, MAX_CONTENT_SIZE);
  console.log(`Generating ${chunks.length} chunks from ${filePath}...`);

  const wallet = new Wallet(WALLET_PRIVATE_KEY as string);
  const provider = new JsonRpcProvider(RPC_URL);
  const signer = wallet.connect(provider);
  const contract = new Contract(FLEX_CONTRACT_ADDRESS as string, ABI, signer);

  for (const chunk of chunks) {
    const tx = await contract.addProjectExternalAssetDependency(
      FLEX_PROJECT_ID,
      chunk,
      2
    );
    console.log(`Submitted chunk upload transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  }
};

main();

const filePath = process.argv[2];
