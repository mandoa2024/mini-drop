import math
import os


def decode_request(rounds: int) -> float:
    total = 0.0
    for value in range(1, rounds):
        total += math.sqrt(value) * 0.000001
    return total


def validate_payload(rounds: int) -> int:
    checksum = 0
    for value in range(rounds):
        checksum = ((checksum << 5) - checksum + value) & 0xFFFFFFFF
    return checksum


def parse_payload() -> tuple[float, int]:
    return decode_request(350_000), validate_payload(220_000)


def render_template(rounds: int) -> str:
    fragments = []
    for value in range(rounds):
        fragments.append(f"row-{value % 64}")
    return "|".join(fragments)


def serialize_response() -> str:
    return render_template(45_000)


def handle_request() -> None:
    parsed = parse_payload()
    response = serialize_response()
    if not parsed or not response:
        raise RuntimeError("unreachable")


def main() -> None:
    print(f"python_hotspot pid={os.getpid()}", flush=True)
    while True:
        handle_request()


if __name__ == "__main__":
    main()
