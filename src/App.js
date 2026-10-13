import React, { useState } from "react";
import Web3 from "web3";
import DominionDAO from "./abis/DominionDAO.json";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);

  const [proposals, setProposals] = useState([]);
  const [daoBalance, setDaoBalance] = useState("0");
  const [contributorBalance, setContributorBalance] = useState("0");

  const [isStakeholder, setIsStakeholder] = useState(false);

  const [myVotes, setMyVotes] = useState([]);

  const [contribution, setContribution] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");

  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // HELPERS
  // =====================================================

  const shortAddress = (address) => {
    if (!address) return "";

    return address.slice(0, 6) + "..." + address.slice(-4);
  };

  const isExpired = (duration) => {
    return Date.now() >= Number(duration) * 1000;
  };

  const openedCount = proposals.filter(
    (proposal) => !isExpired(proposal.duration),
  ).length;

  const filteredProposals = proposals.filter((proposal) => {
    if (filter === "open") {
      return !isExpired(proposal.duration);
    }

    if (filter === "closed") {
      return isExpired(proposal.duration);
    }

    return true;
  });

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadAll = async (daoContract = contract, userAccount = account) => {
    if (!daoContract || !userAccount) {
      return;
    }

    try {
      setLoading(true);

      const dao = await daoContract.methods.daoBalance().call();

      setDaoBalance(Web3.utils.fromWei(dao.toString(), "ether"));

      try {
        const balance = await daoContract.methods.getContributorBalance().call({
          from: userAccount,
        });

        setContributorBalance(Web3.utils.fromWei(balance.toString(), "ether"));
      } catch {
        setContributorBalance("0");
      }

      const stakeholder = await daoContract.methods.isStakeholder().call({
        from: userAccount,
      });

      setIsStakeholder(stakeholder);

      const data = await daoContract.methods.getProposals().call();

      setProposals([...data].reverse());

      try {
        const votes = await daoContract.methods.getStakeholderVotes().call({
          from: userAccount,
        });

        setMyVotes(votes);
      } catch {
        setMyVotes([]);
      }
    } catch (error) {
      console.error("Load data error:", error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CONNECT
  // =====================================================

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Vui lòng cài MetaMask");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const userAccount = accounts[0];

      const web3 = new Web3(window.ethereum);

      const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

      const contractABI = DominionDAO.abi || DominionDAO;

      const daoContract = new web3.eth.Contract(contractABI, contractAddress);

      setAccount(userAccount);
      setContract(daoContract);

      await loadAll(daoContract, userAccount);
    } catch (error) {
      console.error(error);

      alert("Không thể kết nối MetaMask");
    }
  };

  // =====================================================
  // CONTRIBUTE
  // =====================================================

  const contribute = async () => {
    if (!contract || !account) {
      alert("Hãy Connect Wallet trước");
      return;
    }

    if (!contribution) return;

    try {
      await contract.methods.contribute().send({
        from: account,

        value: Web3.utils.toWei(contribution, "ether"),
      });

      alert("Contribution received");

      setContribution("");

      await loadAll();
    } catch (error) {
      console.error(error);

      alert("Contribute thất bại");
    }
  };

  // =====================================================
  // CREATE PROPOSAL
  // =====================================================

  const createProposal = async () => {
    if (!title || !description || !beneficiary || !amount) {
      return;
    }

    if (!Web3.utils.isAddress(beneficiary)) {
      alert("Beneficiary không hợp lệ");
      return;
    }

    try {
      await contract.methods
        .createProposal(
          title,
          description,
          beneficiary,
          Web3.utils.toWei(amount, "ether"),
        )
        .send({
          from: account,
        });

      alert("Proposal created");

      setTitle("");
      setDescription("");
      setBeneficiary("");
      setAmount("");
      setShowModal(false);

      await loadAll();
    } catch (error) {
      console.error(error);

      alert("Tạo proposal thất bại");
    }
  };

  // =====================================================
  // VOTE
  // =====================================================

  const voteProposal = async (id, choice) => {
    try {
      await contract.methods.performVote(id, choice).send({
        from: account,
      });

      alert("Voted successfully!");

      await loadAll();
    } catch (error) {
      console.error(error);

      alert("Vote thất bại");
    }
  };

  // =====================================================
  // PAYOUT
  // =====================================================

  const payout = async (id) => {
    try {
      await contract.methods.payBeneficiary(id).send({
        from: account,
      });

      alert("Beneficiary successfully Paid Out!");

      await loadAll();
    } catch (error) {
      console.error(error);

      alert("Payout thất bại");
    }
  };

  // =====================================================
  // STYLES
  // =====================================================

  const active =
    "bg-blue-600 text-white font-medium text-xs leading-tight uppercase transition duration-150 ease-in-out border border-blue-600";

  const deactive =
    "bg-transparent text-blue-500 font-medium text-xs leading-tight uppercase transition duration-150 ease-in-out border border-blue-600 hover:bg-blue-600 hover:text-white";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-[#212936] text-gray-300">
      {/* HEADER */}

      <header className="sticky top-0 z-40">
        <nav className="shadow-md py-2 bg-[#212936] border-b border-gray-700">
          <div className="px-6 w-full flex items-center justify-between">
            <div className="flex items-center space-x-3 p-2">
              <img
                src="https://haitrieu.com/wp-content/uploads/2021/10/Logo-Hoc-Vien-Cong-Nghe-Buu-Chinh-Vien-Thong-PTITSimple-635x807.png"
                className="w-10 h-10 object-contain"
                alt="PTIT"
              />

              <span className="text-gray-300 font-bold text-xl">
                PTIT Dominion
              </span>
            </div>

            <div className="flex items-center space-x-5">
              <span className="text-blue-500 text-xl">☀</span>

              <button
                onClick={connectWallet}
                className="
                  px-4
                  py-2.5
                  bg-transparent
                  text-blue-500
                  border
                  border-blue-500
                  font-medium
                  text-xs
                  uppercase
                  rounded-full
                  hover:bg-blue-600
                  hover:text-white
                  transition
                "
              >
                {account ? shortAddress(account) : "Connect Wallet"}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* BANNER */}

      <section className="p-8">
        <h2 className="font-semibold text-3xl mb-5 text-gray-200">
          {openedCount} Proposal
          {openedCount === 1 ? "" : "s"} Currently Opened
        </h2>

        <p className="text-sm leading-6">
          Current DAO Balance: <strong>{daoBalance} Eth</strong>
          <br />
          Your contributions: <strong>{contributorBalance} Eth</strong>
          {isStakeholder ? ", and you are now a stakeholder 😊" : ""}
        </p>

        <hr className="my-6 border-gray-500" />

        <p className="text-sm">
          {isStakeholder
            ? "You can now raise proposals on this platform 😆"
            : "Hey, when you contribute upto 0.01 ether you become a stakeholder 😎"}
        </p>

        <div className="flex flex-row justify-start items-center md:w-1/3 w-full mt-4">
          <input
            type="number"
            placeholder="e.g 0.01 Eth"
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            className="
              block
              w-full
              px-3
              py-1.5
              text-base
              bg-transparent
              border
              border-gray-500
              rounded
              shadow-md
              focus:text-gray-300
              focus:outline-none
              focus:ring-0
            "
          />
        </div>

        <div className="flex flex-row justify-start items-center space-x-3 mt-4">
          <button
            onClick={contribute}
            className="
              inline-block
              px-6
              py-2.5
              bg-transparent
              text-blue-500
              font-medium
              text-xs
              uppercase
              shadow-md
              rounded-full
              border
              border-blue-500
              hover:bg-blue-600
              hover:text-white
              transition
            "
          >
            Contribute
          </button>

          {isStakeholder && (
            <button
              onClick={() => setShowModal(true)}
              className="
                inline-block
                px-6
                py-2.5
                bg-transparent
                text-blue-500
                font-medium
                text-xs
                uppercase
                shadow-md
                rounded-full
                border
                border-blue-500
                hover:bg-blue-600
                hover:text-white
                transition
              "
            >
              Propose
            </button>
          )}
        </div>
      </section>

      {/* PROPOSALS */}

      <section className="flex flex-col p-8 pt-2">
        {/* FILTER */}

        <div className="flex flex-row justify-center items-center" role="group">
          <button
            className={`rounded-l-full px-6 py-2.5 ${
              filter === "all" ? active : deactive
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            className={`px-6 py-2.5 ${filter === "open" ? active : deactive}`}
            onClick={() => setFilter("open")}
          >
            Open
          </button>

          <button
            className={`rounded-r-full px-6 py-2.5 ${
              filter === "closed" ? active : deactive
            }`}
            onClick={() => setFilter("closed")}
          >
            Closed
          </button>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 inline-block min-w-full sm:px-6 lg:px-8">
            <div className="overflow-y-auto shadow-md rounded-md">
              <table className="min-w-full">
                <thead className="border-b border-gray-500">
                  <tr>
                    <th className="text-sm font-medium px-6 py-4 text-left">
                      Created By
                    </th>

                    <th className="text-sm font-medium px-6 py-4 text-left">
                      Title
                    </th>

                    <th className="text-sm font-medium px-6 py-4 text-left">
                      Expires
                    </th>

                    <th className="text-sm font-medium px-6 py-4 text-left">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProposals.map((proposal) => {
                    const expired = isExpired(proposal.duration);

                    const hasVoted = myVotes
                      .map((id) => id.toString())
                      .includes(proposal.id.toString());

                    return (
                      <tr
                        key={proposal.id}
                        className="border-b border-gray-500"
                      >
                        <td className="text-sm font-light px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-green-500" />

                            <span>{shortAddress(proposal.proposer)}</span>
                          </div>
                        </td>

                        <td className="text-sm font-light px-6 py-4 whitespace-nowrap">
                          {proposal.title}
                        </td>

                        <td className="text-sm font-light px-6 py-4 whitespace-nowrap">
                          {expired
                            ? "Expired"
                            : new Date(
                                Number(proposal.duration) * 1000,
                              ).toLocaleTimeString()}
                        </td>

                        <td className="text-sm font-light px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            {!expired && !hasVoted && (
                              <>
                                <button
                                  onClick={() =>
                                    voteProposal(proposal.id, true)
                                  }
                                  className="
                                        border
                                        rounded-full
                                        px-6
                                        py-2.5
                                        border-blue-600
                                        text-blue-500
                                        font-medium
                                        text-xs
                                        uppercase
                                        hover:bg-blue-600
                                        hover:text-white
                                        transition
                                      "
                                >
                                  Accept
                                </button>

                                <button
                                  onClick={() =>
                                    voteProposal(proposal.id, false)
                                  }
                                  className="
                                        border
                                        rounded-full
                                        px-6
                                        py-2.5
                                        border-red-600
                                        text-red-500
                                        font-medium
                                        text-xs
                                        uppercase
                                      "
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {expired &&
                            proposal.upvotes > proposal.downvotes ? (
                              proposal.paid ? (
                                <button
                                  disabled
                                  className="
                                      border
                                      rounded-full
                                      px-6
                                      py-2.5
                                      border-green-600
                                      text-green-500
                                      font-medium
                                      text-xs
                                      uppercase
                                    "
                                >
                                  Paid
                                </button>
                              ) : (
                                <button
                                  onClick={() => payout(proposal.id)}
                                  className="
                                      border
                                      rounded-full
                                      px-6
                                      py-2.5
                                      border-red-600
                                      text-red-500
                                      font-medium
                                      text-xs
                                      uppercase
                                      hover:bg-red-600
                                      hover:text-white
                                    "
                                >
                                  Payout
                                </button>
                              )
                            ) : expired ? (
                              <button
                                disabled
                                className="
                                    border
                                    rounded-full
                                    px-6
                                    py-2.5
                                    border-red-600
                                    text-red-500
                                    font-medium
                                    text-xs
                                    uppercase
                                  "
                              >
                                Rejected
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredProposals.length === 0 && (
                <div className="p-10 text-center text-gray-500">
                  No proposals
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CREATE PROPOSAL MODAL */}

      {showModal && (
        <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#212936] shadow-xl shadow-gray-500 rounded-xl w-11/12 md:w-2/5 p-6">
            <div className="flex flex-row justify-between items-center">
              <p className="font-semibold">Raise Proposal</p>

              <button
                onClick={() => setShowModal(false)}
                className="border-0 bg-transparent text-xl"
              >
                ×
              </button>
            </div>

            <div className="border border-gray-500 rounded-xl mt-5">
              <input
                className="block w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-300"
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="border border-gray-500 rounded-xl mt-5">
              <input
                className="block w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-300"
                type="number"
                placeholder="e.g 0.001 Eth"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="border border-gray-500 rounded-xl mt-5">
              <input
                className="block w-full text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-300"
                type="text"
                placeholder="Beneficiary Address"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
              />
            </div>

            <div className="border border-gray-500 rounded-xl mt-5">
              <textarea
                className="block w-full text-sm resize-none bg-transparent border-0 focus:outline-none focus:ring-0 h-20 text-gray-300"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              onClick={createProposal}
              className="
                rounded-lg
                px-6
                py-2.5
                bg-blue-600
                text-white
                font-medium
                text-xs
                uppercase
                hover:bg-blue-700
                transition
                mt-5
                w-full
              "
            >
              Submit Proposal
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-5 right-5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">
          Loading...
        </div>
      )}
    </div>
  );
}

export default App;
