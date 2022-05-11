//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

interface ILPPair {
    function token0() external view returns(address);
    function token1() external view returns(address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

interface IFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IRouter {
    function factory() external pure returns (address);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);


    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) external pure returns (uint256 amountB);

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
    external
    view
    returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path)
    external
    view
    returns (uint256[] memory amounts);
}


interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract DexArbitrage is Ownable {
    bool public isTestMode;
    
    constructor() {
    
    }
    
    function setTestMode(bool _isTestMode) external onlyOwner {
        isTestMode = _isTestMode;
    }
    
    
    function recoverERC20(address _token, address _dest, uint256 _amount) external onlyOwner {
        _safeTokenTransfer(_token, _dest, _amount);
    }
    
    function approveERC20(address _token, address _spender, uint256 _amount) external onlyOwner {
        IERC20(_token).approve(_spender, _amount);
    }
    
    function tradeOnSingleRouter(
        address _token,
        uint256 _amount,
        address[] calldata _pairsRoute,
        address _router,
        uint256 _minProfit,
        uint256 _spotOutBlock,
        uint256 _maxBlocksOffset) external onlyOwner {
            require(block.number <= _spotOutBlock + _maxBlocksOffset, "Too late");
            uint256 routeLength = _pairsRoute.length;
            address[] memory tokensRoute = new address[](routeLength+1);
            
            // get amount-out and construct the path for swapping--------------------------------
            address tokenOut = _token;
            tokensRoute[0] = _token;
            uint256 amountOut = _amount;
            uint256 i;
            while (i < routeLength) {
                ILPPair pair = ILPPair(_pairsRoute[i]);
                (amountOut, tokenOut) = _getAmountOutEx(pair, tokenOut, amountOut);
                tokensRoute[i+1] = tokenOut;
                unchecked {
                    ++i;
                }
            }
            uint256 minAmountOut = isTestMode ? 0 : _amount + _minProfit;
            require(amountOut >= minAmountOut, "looser");
            
            // take the trade -----------------------------------------------------------------
            IRouter(_router).swapExactTokensForTokens(_amount, minAmountOut, tokensRoute, address(this), block.timestamp);
    }
    
    
    function tradeOnMultiRouters(
        address _token,
        uint256 _amount,
        address[] calldata _pairsRoute,
        address[] calldata _routers,
        uint256 _minProfit,
        uint256 _spotOutBlock,
        uint256 _maxBlocksOffset) external onlyOwner {
            require(block.number <= _spotOutBlock + _maxBlocksOffset, "Too late");
            uint256 routeLength = _pairsRoute.length;
            address[] memory tokensRoute = new address[](routeLength+1);
            
            // get amount-out and construct the path for swapping--------------------------------
            address tokenOut = _token;
            tokensRoute[0] = _token;
            uint256 amountOut = _amount;
            uint256 i;
            while (i < routeLength) {
                ILPPair pair = ILPPair(_pairsRoute[i]);
                (amountOut, tokenOut) = _getAmountOutEx(pair, tokenOut, amountOut);
                tokensRoute[i+1] = tokenOut;
                unchecked {
                    ++i;
                }
            }
            uint256 minAmountOut = isTestMode ? 0 : _amount + _minProfit;
            require(amountOut >= _amount + _minProfit, "looser");
            
            // take the trade -------------------------------------------------------------------
            amountOut = _amount;
            i = 0;
            while (i < routeLength) {
                address[] memory path = new address[](2);
                path[0] = tokensRoute[i];
                path[1] = tokensRoute[i+1];
                uint256 appliedAmountOut = (i==routeLength-1 ? minAmountOut : 0);
                uint256[] memory amountsOut = IRouter(_routers[i]).swapExactTokensForTokens(
                    amountOut, appliedAmountOut, path, address(this), block.timestamp);
                amountOut = amountsOut[1];
                unchecked {
                    ++i;
                }
            }
    }
    
    
    function _getAmountOutEx(
        ILPPair _pair,
        address _tokenIn,
        uint256 _amountIn
    ) internal view returns(uint256 amountOut, address tokenOut) {
        (uint256 reserve0, uint256 reserve1, ) = ILPPair(_pair).getReserves();
        require(reserve0 > 0 && reserve1 > 0, "rugged");
        uint256 reserveIn;
        uint256 reserveOut;
        address token0 = _pair.token0();
        if(_tokenIn == token0) {
            reserveIn = reserve0;
            reserveOut = reserve1;
            tokenOut = _pair.token1();
        } else {
            reserveIn = reserve1;
            reserveOut = reserve0;
            tokenOut = token0;
        }
        uint256 amountInWithFee = _amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    function _safeTokenTransfer(address token, address _to, uint256 _amount) internal {
        if (token == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) {
            _transferETH(_to, _amount);
        } else {
            uint256 tokenBal =  IERC20(token).balanceOf(address(this));
            bool transferSuccess = false;
            if (_amount > tokenBal) {
                transferSuccess = IERC20(token).transfer(_to, tokenBal);
            } else {
                transferSuccess = IERC20(token).transfer(_to, _amount);
            }
            require(transferSuccess, "_safeTokenTransfer: transfer failed");            
        }
    }

    function _transferETH(address _to, uint256 _amount) internal {
        //skip transfer if amount is zero
        if (_amount != 0) {
            uint256 avaxBal = address(this).balance;
            if (_amount > avaxBal) {
                payable(_to).transfer(avaxBal);
            } else {
                payable(_to).transfer(_amount);
            }
        }
    }    
}
