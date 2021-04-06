import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Card, Button, Form, Table } from "react-bootstrap";
import { Spacer } from "./Spacer";
import abiDecoder from "abi-decoder";

import useLocalStorageState from "use-local-storage-state";

import masterchefAbi from "./abi/masterchef.json";
import timelockAbi from "./abi/timelock.json";
import gnosisSafeAbi from "./abi/gnosis.json";
import bdpiLogicAbi from "./abi/bdpi-logic.json";
import moduleYieldFarmingV0Abi from "./abi/module-yieldfarmingv0.json";

abiDecoder.addABI(timelockAbi);
abiDecoder.addABI(masterchefAbi);
abiDecoder.addABI(gnosisSafeAbi);
abiDecoder.addABI(bdpiLogicAbi);
abiDecoder.addABI(moduleYieldFarmingV0Abi);

const specialFunctionNames = [
  "queueTransaction",
  "cancelTransaction",
  "executeTransaction",
];

function Decode() {
  const [txData, setTxData] = useState("");
  const [decodedTx, setDecodedTx] = useState({});
  const [epoch, setEpoch] = useState("");
  const [addCustomAbiText, setAddCustomAbiText] = useState("");
  const [customAbi, setCustomAbi] = useState("");
  const [customAbis, setCustomAbis] = useLocalStorageState("custom-abis", []);

  const [dataTypes, setDataTypes] = useState("");
  const [dataAbiEncoded, setDataAbiEncoded] = useState("");

  const invalidTxData = decodedTx instanceof Error;

  useEffect(() => {
    customAbis.forEach((abi) => {
      abiDecoder.addABI(abi);
    });
  }, [customAbis]);

  return (
    <>
      <Spacer y={15} />
      <Card>
        <Card.Body>
          <Form>
            <Form.Group>
              <Form.Label>Add custom ABI (for decoding)</Form.Label>
              <Form.Control
                as="textarea"
                rows="3"
                value={customAbi}
                onChange={(e) => setCustomAbi(e.target.value)}
              />
            </Form.Group>
            <Button
              block
              onClick={(e) => {
                try {
                  const abiJson = JSON.parse(customAbi);
                  setCustomAbis([...customAbis, abiJson]);
                  setAddCustomAbiText("Successfully added!");
                } catch (e) {
                  setAddCustomAbiText(e.toString());
                }
              }}
            >
              Add
            </Button>

            <Spacer y={5} />
            {addCustomAbiText}
          </Form>
        </Card.Body>
      </Card>
      <Spacer y={15} />
      <Card>
        <Card.Body>
          <Form>
            <Form.Group>
              <Form.Label>Argument Types</Form.Label>
              <Form.Control
                type="text"
                value={dataTypes}
                placeholder="address[],uint256"
                onChange={(e) => setDataTypes(e.target.value)}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>ABI-Encode Data</Form.Label>
              <Form.Control
                as="textarea"
                rows="3"
                value={dataAbiEncoded}
                onChange={(e) => setDataAbiEncoded(e.target.value)}
              />
            </Form.Group>

            <Button
              block
              onClick={(e) => {
                e.preventDefault();

                try {
                  const ethTypes = dataTypes.split(" ").join("").split(",");
                  const decoded = ethers.utils.defaultAbiCoder.decode(
                    ethTypes,
                    dataAbiEncoded
                  );

                  setDecodedTx({
                    params: ethTypes.map((x, i) => {
                      return {
                        name: x,
                        value: Array.isArray(decoded[i])
                          ? "[" + decoded[i].join(", ") + "]"
                          : decoded[i],
                      };
                    }),
                  });
                } catch (e) {
                  setDecodedTx(e);
                }
              }}
            >
              Decode
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Spacer y={15} />
      <Card>
        <Card.Body>
          <Form>
            <Form.Group>
              <Form.Label>Tx Data</Form.Label>
              <Form.Control
                as="textarea"
                rows="3"
                value={txData}
                onChange={(e) => setTxData(e.target.value)}
              />
            </Form.Group>

            <Button
              block
              onClick={(e) => {
                e.preventDefault();

                try {
                  const decodedFunction = abiDecoder.decodeMethod(txData);

                  if (specialFunctionNames.includes(decodedFunction.name)) {
                    // target, value, signature, data, eta
                    const signature = decodedFunction.params[2].value;
                    const data = decodedFunction.params[3].value;

                    const functionParams = signature
                      .split("(")[1]
                      .split(")")[0]
                      .split(",");

                    const decodedData = ethers.utils.defaultAbiCoder.decode(
                      functionParams,
                      data
                    );

                    decodedFunction.params[3].value =
                      "[" +
                      decodedData.map((x) => x.toString()).join(", ") +
                      "]" +
                      "\n" +
                      data;
                  }

                  setDecodedTx(decodedFunction);
                } catch (e) {
                  setDecodedTx(e);
                }
              }}
            >
              Decode
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Spacer y={15} />

      <Card>
        <Card.Body>
          <h4>Decoded</h4>
          {invalidTxData && decodedTx.toString()}

          {!invalidTxData && decodedTx.params && (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Param</th>
                </tr>
              </thead>
              <tbody>
                {decodedTx.name && (
                  <>
                    <tr>
                      <td>function</td>
                      <td>{decodedTx.name}</td>
                    </tr>
                  </>
                )}
                {decodedTx.params.map((x) => {
                  return (
                    <tr>
                      <td>{x.name}</td>
                      <td style={{ overflowWrap: "anywhere" }}>{x.value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Spacer y={15} />

      <Card>
        <Card.Body>
          <Form>
            <Form.Group>
              <Form.Label>Hours from ETA</Form.Label>
              <Form.Control
                type="text"
                value={epoch}
                onChange={(e) => setEpoch(e.target.value)}
              />
            </Form.Group>

            <Form.Group>
              {epoch.length > 0 &&
                (parseInt(epoch) - new Date().getTime() / 1000) / (60 * 60)}
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>
    </>
  );
}

export default Decode;
